/**
 * CivicPulse AI - Authentication Service with Role-Based Access Control
 * 
 * Supports:
 * - citizen (Public access, grievance filing, live tracking, satisfaction ratings)
 * - government (Command center, GIS map, priority queue, department & crew dispatch)
 * - field_crew (On-site mobile dispatch, task acceptance, progress updates, photo evidence proof)
 */

const MOCK_CREDENTIALS = {
  citizen: {
    email: 'citizen@civicpulse.ai',
    password: 'Citizen@123',
    name: 'Priya Sharma',
    role: 'citizen',
    avatar: 'PS',
    joinedDate: 'August 2026',
  },
  government: {
    email: 'admin@civicpulse.gov',
    password: 'Admin@123',
    name: 'Officer R. Verma',
    role: 'government',
    department: 'Municipal Infrastructure Operations',
    badgeId: 'GOV-8821',
  },
  field_crew: {
    email: 'crew@civicpulse.ai',
    password: 'Crew@123',
    name: 'Vikram Salve (Crew Leader)',
    role: 'field_crew',
    crewId: 1,
    crewName: 'Ward 4 Water Repair Crew',
    department: 'Water Supply & Drainage',
    badgeId: 'CREW-W4-01',
  },
};

const STORAGE_KEY = 'civicpulse_auth_session';

export const authService = {
  /**
   * Validates credentials for the given role
   */
  login: async (email, password, expectedRole) => {
    // Simulate brief network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    const cleanEmail = email.trim().toLowerCase();
    const targetUser = MOCK_CREDENTIALS[expectedRole];

    if (
      targetUser &&
      cleanEmail === targetUser.email.toLowerCase() &&
      password === targetUser.password
    ) {
      const authData = {
        isAuthenticated: true,
        role: targetUser.role,
        email: targetUser.email,
        name: targetUser.name,
        department: targetUser.department || null,
        badgeId: targetUser.badgeId || null,
        crewId: targetUser.crewId || null,
        crewName: targetUser.crewName || null,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      return authData;
    }

    throw new Error('Invalid email or password for selected portal role.');
  },

  /**
   * Clears current authentication session
   */
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Retrieves current stored user session
   */
  getStoredSession: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && parsed.isAuthenticated && parsed.role) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Helper to retrieve demo credentials for UI autofill
   */
  getDemoCredentials: (role) => {
    const user = MOCK_CREDENTIALS[role];
    if (user) {
      return { email: user.email, password: user.password };
    }
    return { email: '', password: '' };
  },
};

export default authService;
