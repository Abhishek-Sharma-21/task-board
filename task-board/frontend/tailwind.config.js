/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.tsx",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // ── Page / Surface backgrounds ──────────────────────────────
        page:    'var(--bg-page)',
        surface: {
          DEFAULT:  'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          hover:    'var(--bg-surface-hover)',
          active:   'var(--bg-surface-active)',
        },
        input: {
          DEFAULT: 'var(--bg-input)',
          hover:   'var(--bg-input-hover)',
        },
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)',
          hover:   'var(--bg-sidebar-hover)',
          active:  'var(--bg-sidebar-active)',
        },
        header: 'var(--bg-header)',
        card: {
          DEFAULT: 'var(--bg-card)',
          hover:   'var(--bg-card-hover)',
        },
        kanban: {
          DEFAULT:     'var(--bg-kanban)',
          column:      'var(--bg-kanban-column)',
          card:        'var(--bg-kanban-card)',
          'card-hover':'var(--bg-kanban-card-hover)',
        },
        overlay: 'var(--overlay-bg)',

        // ── Brand / Primary ─────────────────────────────────────────
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover:   'var(--color-primary-hover)',
          light:   'var(--color-primary-light)',
          dark:    'var(--color-primary-dark)',
        },

        // ── Status ──────────────────────────────────────────────────
        success: {
          DEFAULT: 'var(--color-success)',
          light:   'var(--color-success-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light:   'var(--color-warning-light)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light:   'var(--color-danger-light)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light:   'var(--color-info-light)',
        },

        // ── Borders ─────────────────────────────────────────────────
        // Usage: border-border, border-border-subtle, border-border-strong,
        //        border-border-input, border-border-focus
        border: {
          DEFAULT: 'var(--border-default)',
          subtle:  'var(--border-subtle)',
          strong:  'var(--border-strong)',
          focus:   'var(--border-focus)',
          input:   'var(--border-input)',
        },

        // ── Text ─────────────────────────────────────────────────────
        // Usage: text-text-primary, text-text-secondary, text-text-muted,
        //        text-text-faint, placeholder-text-faint etc.
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          muted:     'var(--text-muted)',
          faint:     'var(--text-faint)',
        },

        // ── Priority ────────────────────────────────────────────────
        priority: {
          urgent: {
            DEFAULT: 'var(--priority-urgent-text)',
            bg:      'var(--priority-urgent-bg)',
            border:  'var(--priority-urgent-border)',
          },
          high: {
            DEFAULT: 'var(--priority-high-text)',
            bg:      'var(--priority-high-bg)',
            border:  'var(--priority-high-border)',
          },
          medium: {
            DEFAULT: 'var(--priority-medium-text)',
            bg:      'var(--priority-medium-bg)',
            border:  'var(--priority-medium-border)',
          },
          low: {
            DEFAULT: 'var(--priority-low-text)',
            bg:      'var(--priority-low-bg)',
            border:  'var(--priority-low-border)',
          },
        },

        // ── Badges ──────────────────────────────────────────────────
        badge: {
          owner: {
            bg:     'var(--badge-owner-bg)',
            text:   'var(--badge-owner-text)',
            border: 'var(--badge-owner-border)',
          },
          admin: {
            bg:     'var(--badge-admin-bg)',
            text:   'var(--badge-admin-text)',
            border: 'var(--badge-admin-border)',
          },
          member: {
            bg:     'var(--badge-member-bg)',
            text:   'var(--badge-member-text)',
            border: 'var(--badge-member-border)',
          },
        },

        // ── Notifications ───────────────────────────────────────────
        notification: {
          unread:       'var(--notification-unread-bg)',
          'unread-hover':'var(--notification-unread-hover)',
        },

        // ── Tags / Labels ───────────────────────────────────────────
        tag: {
          DEFAULT: 'var(--tag-bg)',
          border:  'var(--tag-border)',
          text:    'var(--tag-text)',
        },
      },

      // ── Shadows ───────────────────────────────────────────────────
      boxShadow: {
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
        'theme-header': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06)',
      },

      // ── Keyframes ────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '500px', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-down': 'slide-down 200ms ease-out',
      },
    },
  },
  plugins: [],
}
