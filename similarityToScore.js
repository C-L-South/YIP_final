export function similarityToScore(simIn, cfg) {
  if (simIn < cfg.score_lim[0]) {
    const slope = -(1 / 3) / cfg.score_lim[0];
    return slope * simIn + 1;
  }

  if (simIn < cfg.score_lim[1]) {
    const slope =
      -(1 / 3) / (cfg.score_lim[1] - cfg.score_lim[0]);

    return (
      slope * (simIn - cfg.score_lim[0]) +
      2 / 3
    );
  }

  const delta = cfg.score_lim[2] - cfg.score_lim[1];
  const tpX = Math.log(3 / 10) * ((simIn - cfg.score_lim[1]) / delta);

  return (1 / 3) * Math.exp(tpX);
}
