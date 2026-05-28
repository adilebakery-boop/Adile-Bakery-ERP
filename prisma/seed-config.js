const DATASETS = {
  small: {
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    branchNames: ['Main Branch'],
    productIds: null,
    reopenScenario: false,
    rolloverScenario: false,
    priceChanges: false,
  },
  medium: {
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    branchNames: ['Main Branch', 'Branch 2'],
    productIds: null,
    reopenScenario: true,
    rolloverScenario: false,
    priceChanges: true,
  },
  large: {
    startDate: '2026-04-01',
    endDate: '2026-05-16',
    branchNames: ['Main Branch', 'Branch 2', 'Branch 3'],
    productIds: null,
    reopenScenario: true,
    rolloverScenario: false,
    priceChanges: false,
  },
};

function getConfig() {
  const name = process.argv[2] || process.env.DATASET || 'large';
  const cfg = DATASETS[name];
  if (!cfg) throw new Error(`Unknown dataset: ${name}. Use small, medium, or large.`);
  return { name, ...cfg };
}

module.exports = { getConfig, DATASETS };
