import React, { useEffect, useMemo, useState } from 'react';
import { redirectToSomethingX } from '../config/redirectUrls';

const DEMO_EMAIL = 'demo@saarthix.com';

const getSomethingXAuth = () => {
  try {
    const token = localStorage.getItem('somethingx_auth_token') || '';
    const userStr = localStorage.getItem('somethingx_auth_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token: '', user: null };
  }
};

const normalizeType = (t) => (t || '').toUpperCase();

const typeToLanding = (t) => {
  const type = normalizeType(t);
  if (type === 'STUDENT') return '/students';
  if (type === 'INSTITUTE') return '/institutes';
  if (type === 'INDUSTRY') return '/industry';
  return '/';
};

export default function DemoViewSwitcher() {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [{ token, user }, setAuth] = useState(() => getSomethingXAuth());

  useEffect(() => {
    const sync = () => setAuth(getSomethingXAuth());
    const onStorage = (e) => {
      if (e.key === 'somethingx_auth_token' || e.key === 'somethingx_auth_user') sync();
    };
    window.addEventListener('storage', onStorage);
    const id = setInterval(sync, 1500);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(id);
    };
  }, []);

  const isDemo = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return !!email && email === DEMO_EMAIL;
  }, [user]);

  const currentType = normalizeType(user?.userType || 'STUDENT');
  const currentLabel = currentType === 'INSTITUTE' ? 'Institute' : currentType === 'INDUSTRY' ? 'Industry' : 'Student';

  const options = useMemo(() => {
    const all = [
      { value: 'STUDENT', label: 'Student' },
      { value: 'INSTITUTE', label: 'Institute' },
      { value: 'INDUSTRY', label: 'Industry' },
    ];
    return all.filter((o) => o.value !== currentType);
  }, [currentType]);

  if (!isDemo) return null;

  const doSwitch = async (targetUserType) => {
    if (switching) return;
    setSwitching(true);
    try {
      const callSwitch = async (url) =>
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetUserType }),
        });

      let res;
      try {
        res = await callSwitch('/api/auth/switch-view');
      } catch (_e) {
        // Local dev fallback (when Jobs runs on a different port without proxy)
        res = await callSwitch('http://localhost:8080/api/auth/switch-view');
      }

      const data = await res.json();
      if (!res.ok || !data?.token || !data?.user) {
        throw new Error(data?.message || 'Failed to switch view');
      }

      localStorage.setItem('somethingx_auth_token', data.token);
      localStorage.setItem(
        'somethingx_auth_user',
        JSON.stringify({
          email: data.user.email,
          name: data.user.name,
          userType: data.user.userType,
        }),
      );

      // Make returning to SomethingX seamless
      localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      try {
        window.dispatchEvent(new Event('storage'));
      } catch {}

      setOpen(false);

      redirectToSomethingX(typeToLanding(targetUserType), data.token, {
        email: data.user.email,
        name: data.user.name,
        userType: data.user.userType,
      });
    } catch (e) {
      alert(e?.message || 'Failed to switch view');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 99999 }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 9999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(17, 24, 39, 0.72)',
            color: '#fff',
            boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Demo view switcher"
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>👁️</span>
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{currentLabel}</span>
          <span style={{ opacity: 0.8, fontSize: 14 }}>{open ? '▴' : '▾'}</span>
        </button>

        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 'calc(100% + 10px)',
                width: 160,
                padding: 8,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(17, 24, 39, 0.9)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(10px)',
                zIndex: 99999,
              }}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => doSwitch(o.value)}
                  disabled={switching}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'transparent',
                    color: '#fff',
                    textAlign: 'left',
                    fontWeight: 700,
                    cursor: switching ? 'not-allowed' : 'pointer',
                    opacity: switching ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

