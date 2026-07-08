'use client';

import { useEffect, useState } from 'react';
import SubNav from '@/app/components/SubNav';
import Icon from '@/app/components/Icon';

type Wanted = {
  id: number;
  title: string;
  city: string;
  budget_nzd_week: number;
  description?: string;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string;
  contact_name?: string;
  contact_email?: string;
  created_at: string;
};

export default function WantedPage() {
  const [items, setItems] = useState<Wanted[]>([]);

  useEffect(() => {
    fetch('/api/wanted')
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '0 16px' }}>
      <SubNav />

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand-blue-light) 0%, var(--brand-primary-light) 100%)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        padding: '40px 24px',
        marginBottom: 32,
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Icon name="users" size={24} color="var(--brand-primary)" />
        </div>
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 900,
          margin: '0 0 8px',
          color: 'var(--text-primary)'
        }}>
          Room Requests
        </h1>
        <p style={{
          color: 'var(--text-muted)',
          margin: '0 0 20px',
          fontSize: 16
        }}>
          People looking for rooms. Find tenants who need your space.
        </p>
        <a
          href="/wanted/post"
          className="btn btn-primary"
          style={{ display: 'inline-flex' }}
        >
          <Icon name="plus" size={16} />
          Post a Request
        </a>
      </div>

      {/* Results */}
      {items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <Icon name="bell" size={40} color="var(--text-faint)" />
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 16,
            margin: '16px 0 0'
          }}>
            No requests yet. Be the first to post!
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border-default)'
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{items.length}</strong> active requests
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((x) => (
              <article
                key={x.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  transition: 'box-shadow 0.15s ease'
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 6px',
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3
                    }}>
                      {x.title}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      color: 'var(--text-muted)',
                      fontSize: 14
                    }}>
                      <Icon name="map" size={14} />
                      {x.city}, New Zealand
                      {x.near_school ? (
                        <span style={{ color: 'var(--text-faint)' }}> · Near {x.near_school}</span>
                      ) : null}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: 'var(--brand-primary)',
                    whiteSpace: 'nowrap'
                  }}>
                    ${x.budget_nzd_week}
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>/wk</span>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className={x.furnished ? 'badge badge-brand' : 'badge badge-neutral'}>
                    {x.furnished ? 'Furnished preferred' : 'Furnished optional'}
                  </span>
                  <span className={x.bills_included ? 'badge badge-success' : 'badge badge-neutral'}>
                    {x.bills_included ? 'Bills included preferred' : 'Bills flexible'}
                  </span>
                </div>

                {/* Description */}
                {x.description ? (
                  <p style={{
                    margin: '0 0 16px',
                    color: 'var(--text-secondary)',
                    fontSize: 15,
                    lineHeight: 1.6
                  }}>
                    {x.description}
                  </p>
                ) : null}

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-light)',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {x.contact_email ? (
                      <a
                        href={`mailto:${x.contact_email}?subject=${encodeURIComponent(`Room offer for your request #${x.id}`)}`}
                        className="btn btn-blue btn-sm"
                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                      >
                        <Icon name="mail" size={14} />
                        Contact
                      </a>
                    ) : null}
                    {x.contact_name ? (
                      <span style={{
                        fontSize: 13,
                        color: 'var(--text-faint)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}>
                        <Icon name="user" size={14} />
                        {x.contact_name}
                      </span>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {new Date(x.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
