async (page) => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const bankroll = async () => Number((await page.locator('#bankroll').innerText()).replaceAll(',', ''));
  assert(await bankroll() === 1000, 'Initial bankroll');
  for (const id of ['hit', 'stand', 'new-round', 'reset']) {
    assert(await page.locator(`#${id}`).isDisabled(), `${id} must be disabled before deal`);
  }
  await page.locator('#bet').focus();
  await page.keyboard.press('ArrowRight');
  assert(await page.locator('#bet-value').innerText() === '20', 'Keyboard wager increments by 10');
  const focus = await page.locator('#bet').evaluate((node) => getComputedStyle(node).outlineWidth);
  assert(parseFloat(focus) > 0, 'Visible keyboard focus');
  await page.getByRole('button', { name: 'Bet 500 chips', exact: true }).click();

  let sawHit = false;
  let sawStand = false;
  let sawHidden = false;
  let sawReset = false;
  let rounds = 0;
  for (; rounds < 35; rounds += 1) {
    const before = await bankroll();
    const wager = Number(await page.locator('#bet-value').innerText());
    await page.locator('#deal').click();
    assert(await bankroll() === before - wager, 'Wager deducted at deal');
    assert(await page.locator('#deal').isDisabled(), 'Double deal is blocked');
    await page.waitForFunction(() => !document.querySelector('#hit').disabled || !document.querySelector('#new-round').disabled);
    if (await page.locator('#hit').isEnabled()) {
      sawHidden = true;
      assert(await page.getByRole('img', { name: 'Face-down card', exact: true }).count() === 1, 'One hidden hole card');
      assert(await page.locator('#dealer-total').innerText() === 'Hole card hidden', 'No dealer total leaks');
      assert(await page.locator('#active-hand').isVisible(), 'Active hand indicator');
      for (const id of ['deal', 'bet', 'new-round', 'reset']) {
        assert(await page.locator(`#${id}`).isDisabled(), `${id} blocked during player turn`);
      }
      if (!sawHit) {
        await page.screenshot({ path: 'output/playwright/desktop-play.png', fullPage: true });
        await page.setViewportSize({ width: 360, height: 800 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No mobile overflow');
        await page.screenshot({ path: 'output/playwright/mobile-play.png', fullPage: true });
        const count = await page.locator('#player-cards .card').count();
        await page.locator('#hit').click();
        sawHit = true;
        assert(await page.locator('#player-cards .card').count() === count + 1, 'Hit adds exactly one card');
      }
      if (await page.locator('#stand').isEnabled()) {
        await page.locator('#stand').click();
        sawStand = true;
      }
    }
    await page.waitForFunction(() => !document.querySelector('#new-round').disabled);
    assert(await page.getByRole('img', { name: 'Face-down card', exact: true }).count() === 0, 'Hole card revealed at round end');
    const text = await page.locator('#outcome').innerText();
    const result = text.match(/Profit: ([+\-\d,]+) chips · Stake returned: ([\d,]+) chips/);
    assert(result !== null, 'Outcome reports profit and stake');
    const profit = Number(result[1].replaceAll(',', ''));
    const stake = Number(result[2].replaceAll(',', ''));
    assert(await bankroll() === before - wager + stake + Math.max(0, profit), 'UI settlement accounting');
    assert(await page.locator('#hit').isDisabled() && await page.locator('#stand').isDisabled(), 'Player actions blocked after settlement');
    if (await bankroll() < 10) {
      assert(await page.locator('#reset').isEnabled(), 'Reset enabled when broke');
      await page.locator('#reset').click();
      assert(await bankroll() === 1000, 'Reset restores bankroll');
      assert(await page.locator('#deal').isEnabled(), 'Reset returns to betting');
      sawReset = true;
      break;
    }
    await page.locator('#new-round').click();
    assert(await page.locator('#deal').isEnabled(), 'New round returns to betting');
  }
  await page.locator('.rules summary').click();
  const rules = await page.locator('.rules').innerText();
  for (const phrase of ['Six decks', '3:2', 'soft 17', '75%', 'No insurance', 'surrender']) {
    assert(rules.includes(phrase), `Rules explain ${phrase}`);
  }
  await page.screenshot({ path: 'output/playwright/mobile-rules.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/desktop-rules.png', fullPage: true });
  assert(sawHit && sawStand && sawHidden && sawReset, 'All essential UI flows covered');
  assert(failures.length === 0, `Browser errors: ${failures.join('; ')}`);
  console.log(JSON.stringify({ passed: true, rounds: rounds + 1, sawHit, sawStand, sawHidden, sawReset, browserErrors: failures }));
}
