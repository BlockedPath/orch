import { applyAction, createGame } from '../engine/game';
import { selectView } from '../engine/view';
import type { CardView, TableView } from '../engine/view';
import type { Action, Card, ErrorCode, GameState, Outcome, Statistics, Suit } from '../engine/types';
import { LocalStorageStore, SAVE_KEY, SaveManager } from '../persistence/save';
import type { KeyValueStore } from '../persistence/save';

const symbols: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const rankNames: Partial<Record<Card['rank'], string>> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
const titles: Record<Outcome, string> = { BLACKJACK: 'Blackjack!', WIN: 'Win', PUSH: 'Push', LOSS: 'Loss', BUST: 'Bust' };
const messages: Record<ErrorCode, string> = {
  UNKNOWN_ACTION: 'Unknown action.', INVALID_BET: 'Choose 10–500 chips in increments of 10.',
  INSUFFICIENT_FUNDS: 'You need enough chips to cover the full wager.', ILLEGAL_PHASE: 'Wait for the next turn.',
  CANNOT_DOUBLE: 'Double requires two cards and is unavailable on split aces.',
  CANNOT_SPLIT: 'Split requires two cards and is unavailable on split aces.', NOT_A_PAIR: 'Split requires identical ranks.',
  MAX_HANDS: 'You can play up to four hands.', RELOAD_NOT_ALLOWED: 'Reset is available below 10 chips, before dealing.',
};
const format = (amount: number): string => amount.toLocaleString('en-US');

function element<T extends HTMLElement>(id: string, constructor: { new (): T }): T {
  const found = document.getElementById(id);
  if (!(found instanceof constructor)) throw new Error(`Missing UI element: ${id}`);
  return found;
}
function textElement(tag: string, text: string, className = ''): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
function cardElement(view: CardView): HTMLElement {
  const node = document.createElement('div');
  node.dataset.cardKey = view.key;
  node.className = 'card';
  node.setAttribute('role', 'img');
  if (view.faceDown) {
    node.classList.add('card-back');
    node.setAttribute('aria-label', 'Face-down card');
    node.append(textElement('span', '♠'));
  } else {
    const card = view.card;
    if (card.suit === 'hearts' || card.suit === 'diamonds') node.classList.add('red');
    node.setAttribute('aria-label', `${rankNames[card.rank] ?? card.rank} of ${card.suit}`);
    node.append(textElement('span', `${card.rank}\n${symbols[card.suit]}`, 'corner'),
      textElement('span', symbols[card.suit], 'pip'),
      textElement('span', `${card.rank}\n${symbols[card.suit]}`, 'corner bottom'));
  }
  for (const child of node.children) child.setAttribute('aria-hidden', 'true');
  return node;
}
function renderCards(container: HTMLElement, cards: readonly CardView[]): void {
  container.replaceChildren(...cards.map(cardElement));
  if (!cards.length) container.append(textElement('span', 'Waiting for the deal', 'card-placeholder'));
}
function total(value: TableView['hands'][number]['value']): string {
  return `${value.total}${value.isSoft ? ' · soft' : ''}${value.isBust ? ' · bust' : ''}`;
}

export function motionDuration(reduced: boolean): number { return reduced ? 0 : 220; }

export function mountGame(options: {
  store?: KeyValueStore; fresh?: () => GameState; reducedMotion?: () => boolean;
  animate?: (before: TableView, after: TableView, duration: number) => Promise<void>;
} = {}): { destroy: () => void } {
  const manager = new SaveManager(options.store ?? new LocalStorageStore(), options.fresh ?? (() => {
    const seed = new Uint32Array(1);
    window.crypto.getRandomValues(seed);
    return createGame({ seed: seed[0] ?? 1 });
  }));
  const loaded = manager.load();
  let state = loaded.state;
  let wager = Math.max(10, Math.min(state.lastBet ?? 10, selectView(state).maxBet));
  let busy = false;
  let generation = 0;
  const cleanup: (() => void)[] = [];
  const bankroll = element('bankroll', HTMLElement);
  const bet = element('bet', HTMLInputElement);
  const betValue = element('bet-value', HTMLElement);
  const dealerCards = element('dealer-cards', HTMLElement);
  const dealerTotal = element('dealer-total', HTMLElement);
  const hands = element('player-hands', HTMLElement);
  const outcome = element('outcome', HTMLElement);
  const error = element('error', HTMLElement);
  const notice = element('save-notice', HTMLElement);
  const statsValues = element('stats-values', HTMLElement);
  const shoeStatus = element('shoe-status', HTMLElement);
  const rulesDialog = element('rules-dialog', HTMLDialogElement);
  const statsDialog = element('stats-dialog', HTMLDialogElement);
  const buttons = {
    deal: element('deal', HTMLButtonElement), hit: element('hit', HTMLButtonElement),
    stand: element('stand', HTMLButtonElement), double: element('double', HTMLButtonElement), split: element('split', HTMLButtonElement),
    newRound: element('new-round', HTMLButtonElement), reset: element('reset', HTMLButtonElement),
  };
  const chips = document.querySelectorAll<HTMLButtonElement>('[data-bet]');
  notice.textContent = loaded.notice;
  if (loaded.kind === 'NEW') {
    const saved = manager.save(state);
    if (!saved.ok) {
      if (saved.reason === 'STALE') state = saved.current;
      else notice.textContent = 'Progress not saved: browser storage is unavailable.';
    }
  }
  function listen(target: EventTarget, event: string, listener: EventListener): void {
    target.addEventListener(event, listener);
    cleanup.push(() => target.removeEventListener(event, listener));
  }
  function render(): void {
    const view = selectView(state);
    const legal = view.legal;
    bankroll.textContent = format(view.bankroll);
    bet.max = String(Math.max(10, view.maxBet));
    bet.value = String(wager);
    betValue.textContent = format(wager);
    bet.disabled = busy || !legal.deal;
    buttons.deal.disabled = busy || !legal.deal;
    buttons.hit.disabled = busy || !legal.hit;
    buttons.stand.disabled = busy || !legal.stand;
    buttons.double.disabled = busy || !legal.double.allowed;
    buttons.split.disabled = busy || !legal.split.allowed;
    buttons.newRound.disabled = busy || !legal.newRound;
    buttons.reset.disabled = busy || !legal.reload;
    buttons.double.title = legal.double.reason ? messages[legal.double.reason] : 'Double the wager, take one card, then stand.';
    buttons.split.title = legal.split.reason ? messages[legal.split.reason] : 'Split into two hands with equal wagers.';
    for (const chip of chips) {
      const amount = Number(chip.dataset.bet);
      chip.disabled = busy || !legal.deal || amount > view.maxBet;
      chip.setAttribute('aria-pressed', String(amount === wager));
      chip.setAttribute('aria-label', `Bet ${amount} chips`);
    }
    renderCards(dealerCards, view.dealer.cards);
    dealerTotal.textContent = busy ? '—' : view.dealer.value ? `${view.dealer.revealed ? '' : 'Showing '}${total(view.dealer.value)}` : '—';
    hands.dataset.count = String(view.hands.length);
    hands.replaceChildren(...view.hands.map((hand, index) => {
      const section = document.createElement('section');
      section.className = `player-hand${hand.isActive ? ' active' : ''}`;
      section.setAttribute('aria-label', `Hand ${index + 1}${hand.isActive ? ', your turn' : ''}`);
      const heading = textElement('div', '', 'hand-heading');
      heading.append(textElement('h3', `Hand ${index + 1}`), textElement('span', busy ? '—' : total(hand.value), 'total hand-total'));
      const cards = textElement('div', '', 'cards');
      renderCards(cards, hand.cards);
      const badges = textElement('div', '', 'hand-badges');
      badges.append(textElement('span', `${format(hand.wager)} chips`, 'wager-badge'));
      if (hand.isActive) badges.append(textElement('span', 'Your turn', 'active-indicator'));
      if (hand.doubled) badges.append(textElement('span', 'Doubled', 'doubled-badge'));
      if (hand.splitAces) badges.append(textElement('span', 'Split ace', 'split-badge'));
      const status = hand.settlement && !busy ? titles[hand.settlement.outcome]
        : hand.status === 'PENDING' ? 'Up next' : hand.status === 'STOOD' ? 'Stood' : hand.status === 'BUST' ? 'Bust' : '';
      if (status) badges.append(textElement('span', status, 'hand-result'));
      section.append(heading, cards, badges);
      if (hand.settlement && !busy) section.append(textElement('p', `Profit: ${hand.settlement.profit > 0 ? '+' : ''}${format(hand.settlement.profit)} · Stake returned: ${format(hand.settlement.stakeReturned)}`, 'hand-settlement'));
      return section;
    }));
    if (!view.hands.length) hands.append(textElement('span', 'Waiting for the deal', 'card-placeholder'));
    let title = 'Take a seat.';
    let message = 'Choose your wager, then deal the cards.';
    if (busy) { title = 'Cards in motion.'; message = 'Your move is saved. The cards are being dealt.'; }
    else if (view.phase === 'PLAYER_TURN') {
      title = `Your move${view.hands.length > 1 ? ` · Hand ${(state.round?.activeHandIndex ?? 0) + 1}` : ''}.`;
      message = `Total ${view.hands.find((hand) => hand.isActive)?.value.total ?? ''}. Hit, stand, or use an available double or split.`;
    } else if (view.roundSummary) {
      const summary = view.roundSummary;
      const first = summary.outcomes[0];
      title = summary.outcomes.length === 1 && first ? titles[first]
        : summary.profit > 0 ? 'Round won.' : summary.profit < 0 ? 'Round lost.' : 'Round even.';
      message = `Profit: ${summary.profit > 0 ? '+' : ''}${format(summary.profit)} chips · Stake returned: ${format(summary.stakeReturned)} chips`;
      if (view.bankroll < 10) message += ' · Start a New Round to reset your bankroll.';
    } else if (view.bankroll < 10) { title = 'Time to reload.'; message = 'Reset your bankroll to get 1,000 play chips.'; }
    outcome.replaceChildren(textElement('strong', title), textElement('span', message));
    const stats: [keyof Statistics, string][] = [['rounds','Rounds'],['hands','Hands'],['wins','Won'],['losses','Lost'],
      ['pushes','Pushed'],['naturals','Blackjacks'],['doubles','Doubles'],['splits','Splits'],['totalWagered','Total wagered'],
      ['netProfit','Net profit'],['biggestWin','Biggest round win'],['peakBankroll','Peak bankroll'],['reloads','Reloads']];
    statsValues.replaceChildren(...stats.map(([key,label]) => {
      const entry = document.createElement('div');
      entry.append(textElement('dt',label), textElement('dd',format(view.stats[key])));
      return entry;
    }));
    shoeStatus.textContent = `${view.shoe.remaining} cards left${view.shoe.cutReached ? ' · Reshuffle next round' : ' · Cut at 75%'}`;
  }
  async function animate(before: TableView, after: TableView, duration: number): Promise<void> {
    if (!duration) return;
    const oldKeys = new Set([...before.dealer.cards,...before.hands.flatMap((hand)=>hand.cards)].map((card)=>card.key));
    const animations: Animation[] = [];
    let delay = 0;
    for (const card of document.querySelectorAll<HTMLElement>('[data-card-key]')) {
      const key = card.dataset.cardKey;
      const flip = key === 'dealer-1' && before.dealer.cards[1]?.faceDown && !after.dealer.cards[1]?.faceDown;
      if (flip || !oldKeys.has(key ?? '')) {
        const animation = card.animate(flip ? [
          {transform:'rotateY(90deg)',opacity:0.25},{transform:'rotateY(0)',opacity:1},
        ] : [
          {transform:'translate(35px,-55px) rotate(8deg)',opacity:0},{transform:'translate(0,0) rotate(0)',opacity:1},
        ], {duration,delay,easing:'ease-out',fill:'both'});
        animations.push(animation);
        delay += duration * 0.35;
      }
    }
    await Promise.all(animations.map((animation)=>animation.finished.catch(()=>undefined)));
  }
  async function dispatch(action: Action): Promise<void> {
    if (busy) return;
    const before = selectView(state);
    const result = applyAction(state, action);
    if (!result.ok) { error.textContent = messages[result.error]; return; }
    const saved = manager.save(result.state);
    if (!saved.ok && saved.reason === 'STALE') {
      state = saved.current;
      notice.textContent = 'Another tab changed the table. The latest saved table has been loaded.';
      wager = Math.max(10, Math.min(state.lastBet ?? wager, selectView(state).maxBet));
      render();
      return;
    }
    if (!saved.ok) notice.textContent = 'Progress not saved: browser storage is unavailable.';
    state = result.state;
    if (action.type === 'NEW_ROUND' || action.type === 'RELOAD_BANKROLL') wager = Math.max(10,Math.min(state.lastBet ?? 10,selectView(state).maxBet));
    error.textContent = '';
    const hasCards = result.events.some((event)=>event.type === 'CARD_DEALT' || event.type === 'HOLE_REVEALED');
    const duration = motionDuration((options.reducedMotion ?? (()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches))());
    busy = hasCards;
    const token = ++generation;
    render();
    try { if (hasCards) await (options.animate ?? animate)(before,selectView(state),duration); }
    finally {
      if (token === generation) {
        busy = false;
        render();
        const active = document.activeElement;
        if (active instanceof HTMLButtonElement && active.disabled || !active || active === document.body) {
          Object.values(buttons).find((button)=>!button.disabled)?.focus({preventScroll:true});
        }
      }
    }
  }
  const actions: [HTMLButtonElement, () => Action][] = [
    [buttons.deal,()=>({type:'DEAL',bet:wager})],[buttons.hit,()=>({type:'HIT'})],[buttons.stand,()=>({type:'STAND'})],
    [buttons.double,()=>({type:'DOUBLE'})],[buttons.split,()=>({type:'SPLIT'})],
    [buttons.newRound,()=>({type:'NEW_ROUND'})],[buttons.reset,()=>({type:'RELOAD_BANKROLL'})],
  ];
  for (const [button, action] of actions) listen(button,'click',()=>{void dispatch(action());});
  listen(bet,'input',()=>{if(!busy && selectView(state).legal.deal) {wager=Number(bet.value);render();}});
  for(const chip of chips) listen(chip,'click',()=>{if(!chip.disabled) {wager=Number(chip.dataset.bet);render();}});
  for(const [dialog,openId,closeId] of [[rulesDialog,'rules-open','rules-close'],[statsDialog,'stats-open','stats-close']] as const) {
    listen(element(openId,HTMLButtonElement),'click',()=>dialog.showModal());
    listen(element(closeId,HTMLButtonElement),'click',()=>dialog.close());
  }
  const shortcuts: Record<string,HTMLButtonElement> = {d:buttons.deal,h:buttons.hit,s:buttons.stand,'2':buttons.double,x:buttons.double,p:buttons.split,n:buttons.newRound,r:buttons.reset};
  listen(document,'keydown',(event)=>{
    if(!(event instanceof KeyboardEvent) || event.repeat || event.altKey || event.ctrlKey || event.metaKey || rulesDialog.open || statsDialog.open) return;
    const target=event.target;
    if(target instanceof HTMLElement && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))) return;
    const button=shortcuts[event.key.toLowerCase()];
    if(button && !button.disabled) {event.preventDefault();button.click();}
  });
  listen(window,'storage',(event)=>{
    if(!(event instanceof StorageEvent) || event.key!==SAVE_KEY || !event.newValue) return;
    const newer=manager.adopt(event.newValue);
    if(newer) {
      generation+=1;
      for(const animation of document.getAnimations?.() ?? []) animation.cancel();
      busy=false;
      state=newer;
      wager=Math.max(10,Math.min(state.lastBet ?? wager,selectView(state).maxBet));
      notice.textContent='Table updated from another tab.';
      render();
    }
  });
  render();
  return {destroy:()=>{generation+=1;for(const remove of cleanup) remove();}};
}
