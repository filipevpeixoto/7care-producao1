/**
 * FeatureFlagsService unit tests
 * Tests flag initialization, evaluation strategies, CRUD, and listing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import SUT — the module has internal state (featureFlags Map, isInitialized)
// We reset it by dynamically re-importing or by using removeFlag + setFlag.
// Since vi.mock with mockReset is on, we reimport a fresh module each test suite.

// We need to reset the module-level state between tests.
// The easiest approach: use vi.resetModules() + dynamic import in beforeEach.

describe('FeatureFlagsService', () => {
  let initFeatureFlags: typeof import('../services/featureFlagsService').initFeatureFlags;
  let isFeatureEnabled: typeof import('../services/featureFlagsService').isFeatureEnabled;
  let getEnabledFeatures: typeof import('../services/featureFlagsService').getEnabledFeatures;
  let getAllFlags: typeof import('../services/featureFlagsService').getAllFlags;
  let setFlag: typeof import('../services/featureFlagsService').setFlag;
  let removeFlag: typeof import('../services/featureFlagsService').removeFlag;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module registry to get fresh module state (featureFlags Map + isInitialized)
    vi.resetModules();
    const mod = await import('../services/featureFlagsService');
    initFeatureFlags = mod.initFeatureFlags;
    isFeatureEnabled = mod.isFeatureEnabled;
    getEnabledFeatures = mod.getEnabledFeatures;
    getAllFlags = mod.getAllFlags;
    setFlag = mod.setFlag;
    removeFlag = mod.removeFlag;
  });

  describe('initFeatureFlags()', () => {
    it('initializes default flags', () => {
      initFeatureFlags();

      const flags = getAllFlags();

      expect(flags.length).toBeGreaterThan(0);
      const names = flags.map(f => f.name);
      expect(names).toContain('dark_mode');
      expect(names).toContain('new_dashboard');
      expect(names).toContain('advanced_reports');
    });

    it('is idempotent — calling twice does not duplicate flags', () => {
      initFeatureFlags();
      const count1 = getAllFlags().length;

      initFeatureFlags();
      const count2 = getAllFlags().length;

      expect(count2).toBe(count1);
    });
  });

  describe('isFeatureEnabled() — strategy: all', () => {
    it('returns true when strategy is "all" and flag is enabled', () => {
      initFeatureFlags();
      // dark_mode is enabled with strategy 'all'
      expect(isFeatureEnabled('dark_mode')).toBe(true);
    });

    it('returns true for any user context', () => {
      initFeatureFlags();
      expect(isFeatureEnabled('dark_mode', { userId: 999, role: 'member' })).toBe(true);
    });
  });

  describe('isFeatureEnabled() — strategy: none', () => {
    it('returns false when strategy is "none"', () => {
      initFeatureFlags();
      setFlag('disabled_feature', {
        enabled: true,
        strategy: 'none',
        description: 'Disabled by strategy',
        config: {},
      });

      expect(isFeatureEnabled('disabled_feature')).toBe(false);
    });
  });

  describe('isFeatureEnabled() — strategy: percentage', () => {
    it('returns true when user hash is below percentage', () => {
      initFeatureFlags();
      setFlag('pct_flag', {
        enabled: true,
        strategy: 'percentage',
        description: 'Percentage flag',
        config: { percentage: 10 },
      });

      // userId=5 → hash = 5 % 100 = 5 < 10 → enabled
      expect(isFeatureEnabled('pct_flag', { userId: 5 })).toBe(true);
    });

    it('returns false when user hash is above percentage', () => {
      initFeatureFlags();
      setFlag('pct_flag', {
        enabled: true,
        strategy: 'percentage',
        description: 'Percentage flag',
        config: { percentage: 10 },
      });

      // userId=50 → hash = 50 % 100 = 50 >= 10 → disabled
      expect(isFeatureEnabled('pct_flag', { userId: 50 })).toBe(false);
    });

    it('returns false when no userId provided', () => {
      initFeatureFlags();
      setFlag('pct_flag', {
        enabled: true,
        strategy: 'percentage',
        description: 'Percentage flag',
        config: { percentage: 50 },
      });

      expect(isFeatureEnabled('pct_flag', {})).toBe(false);
    });
  });

  describe('isFeatureEnabled() — strategy: userIds', () => {
    it('returns true when userId is in the list', () => {
      initFeatureFlags();
      setFlag('user_flag', {
        enabled: true,
        strategy: 'userIds',
        description: 'User-specific flag',
        config: { userIds: [10, 20, 30] },
      });

      expect(isFeatureEnabled('user_flag', { userId: 20 })).toBe(true);
    });

    it('returns false when userId is not in the list', () => {
      initFeatureFlags();
      setFlag('user_flag', {
        enabled: true,
        strategy: 'userIds',
        description: 'User-specific flag',
        config: { userIds: [10, 20, 30] },
      });

      expect(isFeatureEnabled('user_flag', { userId: 99 })).toBe(false);
    });
  });

  describe('isFeatureEnabled() — strategy: roles', () => {
    it('returns true when role matches', () => {
      initFeatureFlags();
      // advanced_reports has strategy 'roles' with ['superadmin', 'pastor']
      expect(isFeatureEnabled('advanced_reports', { role: 'pastor' })).toBe(true);
    });

    it('returns false when role does not match', () => {
      initFeatureFlags();
      expect(isFeatureEnabled('advanced_reports', { role: 'member' })).toBe(false);
    });

    it('returns false when no role provided', () => {
      initFeatureFlags();
      expect(isFeatureEnabled('advanced_reports', {})).toBe(false);
    });
  });

  describe('isFeatureEnabled() — strategy: churches', () => {
    it('returns true when church matches', () => {
      initFeatureFlags();
      setFlag('church_flag', {
        enabled: true,
        strategy: 'churches',
        description: 'Church-specific',
        config: { churches: ['church-a', 'church-b'] },
      });

      expect(isFeatureEnabled('church_flag', { church: 'church-a' })).toBe(true);
    });

    it('returns false when church does not match', () => {
      initFeatureFlags();
      setFlag('church_flag', {
        enabled: true,
        strategy: 'churches',
        description: 'Church-specific',
        config: { churches: ['church-a'] },
      });

      expect(isFeatureEnabled('church_flag', { church: 'church-z' })).toBe(false);
    });
  });

  describe('isFeatureEnabled() — strategy: environment', () => {
    it('returns true when NODE_ENV matches', () => {
      initFeatureFlags();
      setFlag('env_flag', {
        enabled: true,
        strategy: 'environment',
        description: 'Env-specific',
        config: { environments: ['test'] },
      });

      // process.env.NODE_ENV is 'test' (set in setup.ts)
      expect(isFeatureEnabled('env_flag')).toBe(true);
    });

    it('returns false when NODE_ENV does not match', () => {
      initFeatureFlags();
      setFlag('env_flag', {
        enabled: true,
        strategy: 'environment',
        description: 'Env-specific',
        config: { environments: ['production'] },
      });

      expect(isFeatureEnabled('env_flag')).toBe(false);
    });
  });

  describe('isFeatureEnabled() — unknown flag', () => {
    it('returns false for a flag that does not exist', () => {
      initFeatureFlags();
      expect(isFeatureEnabled('totally_unknown_flag')).toBe(false);
    });
  });

  describe('isFeatureEnabled() — disabled flag', () => {
    it('returns false when enabled is false regardless of strategy', () => {
      initFeatureFlags();
      setFlag('off_flag', {
        enabled: false,
        strategy: 'all',
        description: 'Disabled flag',
        config: {},
      });

      expect(isFeatureEnabled('off_flag')).toBe(false);
    });
  });

  describe('setFlag()', () => {
    it('creates a new flag', () => {
      initFeatureFlags();
      const flag = setFlag('new_flag', {
        enabled: true,
        strategy: 'all',
        description: 'Brand new',
        config: {},
      });

      expect(flag.name).toBe('new_flag');
      expect(flag.enabled).toBe(true);
      expect(flag.strategy).toBe('all');
      expect(isFeatureEnabled('new_flag')).toBe(true);
    });

    it('updates an existing flag', () => {
      initFeatureFlags();
      setFlag('dark_mode', {
        enabled: false,
      });

      expect(isFeatureEnabled('dark_mode')).toBe(false);
    });
  });

  describe('removeFlag()', () => {
    it('deletes an existing flag', () => {
      initFeatureFlags();
      const removed = removeFlag('dark_mode');

      expect(removed).toBe(true);
      expect(isFeatureEnabled('dark_mode')).toBe(false);
    });

    it('returns false for a non-existent flag', () => {
      initFeatureFlags();
      const removed = removeFlag('no_such_flag');

      expect(removed).toBe(false);
    });
  });

  describe('getEnabledFeatures()', () => {
    it('returns all enabled features for a given context', () => {
      initFeatureFlags();
      const features = getEnabledFeatures({ role: 'superadmin', userId: 1 });

      // Should include 'all' strategy flags (dark_mode, offline_mode, push_notifications, two_factor_auth)
      expect(features).toContain('dark_mode');
      expect(features).toContain('offline_mode');
      // advanced_reports requires role superadmin/pastor
      expect(features).toContain('advanced_reports');
    });

    it('returns only "all" strategy flags with no context', () => {
      initFeatureFlags();
      const features = getEnabledFeatures();

      expect(features).toContain('dark_mode');
      // percentage/roles flags should NOT be included without context
      expect(features).not.toContain('new_dashboard');
      expect(features).not.toContain('advanced_reports');
    });
  });

  describe('getAllFlags()', () => {
    it('returns all registered flags', () => {
      initFeatureFlags();
      const flags = getAllFlags();

      expect(flags.length).toBeGreaterThanOrEqual(8); // 8 default flags
      const names = flags.map(f => f.name);
      expect(names).toContain('new_dashboard');
      expect(names).toContain('advanced_reports');
      expect(names).toContain('dark_mode');
      expect(names).toContain('beta_features');
      expect(names).toContain('ai_assistant');
      expect(names).toContain('offline_mode');
      expect(names).toContain('push_notifications');
      expect(names).toContain('two_factor_auth');
    });

    it('returns empty array before initialization', () => {
      const flags = getAllFlags();

      expect(flags).toEqual([]);
    });
  });
});
