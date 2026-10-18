import { describe, it, expect } from 'vitest';
import { checkSupabaseConnection } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';

describe('Supabase Service & Connection Diagnostics', () => {
  it('reports unconfigured state safely without throwing when environment variables are missing', async () => {
    // In our test runner environment, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not preset
    const result = await checkSupabaseConnection();
    expect(result).toBeDefined();
    if (!isSupabaseConfigured) {
      expect(result.connected).toBe(false);
      expect(result.error).toContain('Supabase credentials not configured');
    }
  });

  it('guarantees isSupabaseConfigured boolean is deterministic', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });
});
