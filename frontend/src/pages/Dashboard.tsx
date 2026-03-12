import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Wine, Package, ArrowLeftRight, Activity, TrendingUp, FlaskConical,
  Layers, ChevronRight, GitMerge, Sparkles, BarChart3, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  lots: { active_lots: string; bottled_lots: string; total_volume: string; vintages_count: string };
  containers: { total: string; in_use: string; available: string; in_maintenance: string };
  movements_30d: { count: string; total_volume: string };
  operations: { planned: string; in_progress: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WINE_COLORS: Record<string, string> = {
  rouge: '#8B1A2F', blanc: '#D97706', rose: '#DB2777',
  petillant: '#1D4ED8', mousseux: '#7C3AED', muté: '#C2410C', autre: '#6B7280',
};
const TYPE_LABELS: Record<string, string> = {
  rouge: 'Rouge', blanc: 'Blanc', rose: 'Rosé',
  petillant: 'Pétillant', mousseux: 'Mousseux', muté: 'Muté', autre: 'Autre',
};
const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
  assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
  collage: 'Collage', perte: 'Perte', bottling: 'Mise en bouteille',
};

const displayFont = "'Cabinet Grotesk', 'Satoshi', system-ui, sans-serif";
const uiFont = "'Satoshi', system-ui, sans-serif";

const SHADOW_CARD = '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)';
const SHADOW_HOVER = '0 4px 8px rgba(26,23,20,0.10), 0 12px 24px rgba(26,23,20,0.07)';
const SHADOW_ELEVATED = '0 8px 24px rgba(26,23,20,0.12), 0 24px 48px rgba(26,23,20,0.08)';

// ─── Inline SVG Illustrations ────────────────────────────────────────────────

function BarrelSVG() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Main barrel body */}
      <ellipse cx="70" cy="20" rx="38" ry="10" fill="#6F1526" opacity="0.9"/>
      <rect x="32" y="20" width="76" height="80" rx="4" fill="#8B1A2F"/>
      <ellipse cx="70" cy="100" rx="38" ry="10" fill="#5A1020" opacity="0.9"/>
      {/* Barrel bulge — center wider */}
      <path d="M32 60 Q18 60 18 60 Q32 60 32 60Z" fill="none"/>
      <rect x="28" y="38" width="84" height="44" rx="42" fill="#9B2235" opacity="0.4"/>
      {/* Wood grain lines */}
      <line x1="50" y1="20" x2="50" y2="100" stroke="#6F1526" strokeWidth="1.5" strokeDasharray="0"/>
      <line x1="70" y1="20" x2="70" y2="100" stroke="#6F1526" strokeWidth="1.5"/>
      <line x1="90" y1="20" x2="90" y2="100" stroke="#6F1526" strokeWidth="1.5"/>
      {/* Hoops */}
      <rect x="30" y="26" width="80" height="6" rx="3" fill="#4A0F1E" opacity="0.85"/>
      <rect x="30" y="88" width="80" height="6" rx="3" fill="#4A0F1E" opacity="0.85"/>
      <rect x="26" y="55" width="88" height="7" rx="3.5" fill="#3D0D18" opacity="0.9"/>
      {/* Tap / bung hole */}
      <circle cx="70" cy="59" r="5" fill="#3D0D18"/>
      <circle cx="70" cy="59" r="3" fill="#6F1526"/>
      {/* Hoop rivets */}
      {[38,52,88,102].map((x) => (
        <circle key={x} cx={x} cy="29" r="2" fill="#FDF2F4" opacity="0.5"/>
      ))}
      {[38,52,88,102].map((x) => (
        <circle key={x} cx={x} cy="91" r="2" fill="#FDF2F4" opacity="0.5"/>
      ))}
      {/* Wine drop dripping */}
      <ellipse cx="110" cy="72" rx="4" ry="6" fill="#FDF2F4" opacity="0.25"/>
      <path d="M110 78 Q108 83 110 86 Q112 83 110 78Z" fill="#FDF2F4" opacity="0.18"/>
    </svg>
  );
}

function LotTraceSVG() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Wine bottle silhouette */}
      <path d="M30 60 L30 35 Q30 28 34 24 L34 16 L46 16 L46 24 Q50 28 50 35 L50 60 Q50 66 44 66 L36 66 Q30 66 30 60Z"
        fill="#FDF2F4" stroke="#8B1A2F" strokeWidth="1.5"/>
      {/* Bottle neck */}
      <rect x="34" y="10" width="12" height="6" rx="2" fill="#F3C5CE" stroke="#8B1A2F" strokeWidth="1.5"/>
      {/* Cork */}
      <rect x="35" y="8" width="10" height="5" rx="1.5" fill="#D97706" opacity="0.8"/>
      {/* Wine fill inside bottle */}
      <path d="M31 50 L31 60 Q31 65 36 65 L44 65 Q49 65 49 60 L49 50Z" fill="#8B1A2F" opacity="0.25"/>
      {/* Barcode lines beside bottle */}
      <rect x="55" y="28" width="2" height="24" rx="0.5" fill="#8B1A2F" opacity="0.7"/>
      <rect x="59" y="28" width="1" height="24" rx="0.5" fill="#8B1A2F" opacity="0.5"/>
      <rect x="62" y="28" width="3" height="24" rx="0.5" fill="#8B1A2F" opacity="0.7"/>
      <rect x="67" y="28" width="1" height="24" rx="0.5" fill="#8B1A2F" opacity="0.5"/>
      <rect x="70" y="28" width="2" height="24" rx="0.5" fill="#8B1A2F" opacity="0.6"/>
      {/* QR dots cluster */}
      <rect x="55" y="55" width="5" height="5" rx="1" fill="#8B1A2F" opacity="0.4"/>
      <rect x="62" y="55" width="5" height="5" rx="1" fill="#8B1A2F" opacity="0.4"/>
      <rect x="55" y="62" width="5" height="5" rx="1" fill="#8B1A2F" opacity="0.4"/>
      <rect x="62" y="62" width="2" height="2" rx="0.5" fill="#8B1A2F" opacity="0.6"/>
      <rect x="66" y="62" width="2" height="2" rx="0.5" fill="#8B1A2F" opacity="0.4"/>
      {/* Label on bottle */}
      <rect x="33" y="38" width="14" height="16" rx="1" fill="#8B1A2F" opacity="0.12" stroke="#8B1A2F" strokeWidth="0.75"/>
      <line x1="35" y1="43" x2="45" y2="43" stroke="#8B1A2F" strokeWidth="0.75" opacity="0.5"/>
      <line x1="35" y1="46" x2="43" y2="46" stroke="#8B1A2F" strokeWidth="0.75" opacity="0.4"/>
      <line x1="35" y1="49" x2="44" y2="49" stroke="#8B1A2F" strokeWidth="0.75" opacity="0.3"/>
    </svg>
  );
}

function AISparkleSVG() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Neural network nodes */}
      <circle cx="40" cy="40" r="8" fill="#7C5CBF" opacity="0.9"/>
      <circle cx="14" cy="24" r="5" fill="#9B7FD4" opacity="0.7"/>
      <circle cx="66" cy="24" r="5" fill="#9B7FD4" opacity="0.7"/>
      <circle cx="14" cy="56" r="5" fill="#9B7FD4" opacity="0.7"/>
      <circle cx="66" cy="56" r="5" fill="#9B7FD4" opacity="0.7"/>
      <circle cx="40" cy="10" r="4" fill="#B8A0E8" opacity="0.6"/>
      <circle cx="40" cy="70" r="4" fill="#B8A0E8" opacity="0.6"/>
      {/* Connection lines */}
      <line x1="40" y1="32" x2="14" y2="24" stroke="#7C5CBF" strokeWidth="1" opacity="0.5"/>
      <line x1="40" y1="32" x2="66" y2="24" stroke="#7C5CBF" strokeWidth="1" opacity="0.5"/>
      <line x1="40" y1="48" x2="14" y2="56" stroke="#7C5CBF" strokeWidth="1" opacity="0.5"/>
      <line x1="40" y1="48" x2="66" y2="56" stroke="#7C5CBF" strokeWidth="1" opacity="0.5"/>
      <line x1="40" y1="32" x2="40" y2="14" stroke="#7C5CBF" strokeWidth="1" opacity="0.4"/>
      <line x1="40" y1="48" x2="40" y2="66" stroke="#7C5CBF" strokeWidth="1" opacity="0.4"/>
      <line x1="19" y1="24" x2="35" y2="37" stroke="#9B7FD4" strokeWidth="0.75" opacity="0.4"/>
      <line x1="61" y1="24" x2="45" y2="37" stroke="#9B7FD4" strokeWidth="0.75" opacity="0.4"/>
      <line x1="19" y1="56" x2="35" y2="43" stroke="#9B7FD4" strokeWidth="0.75" opacity="0.4"/>
      <line x1="61" y1="56" x2="45" y2="43" stroke="#9B7FD4" strokeWidth="0.75" opacity="0.4"/>
      {/* Wine drops as data nodes */}
      <path d="M26 14 Q24 19 26 22 Q28 19 26 14Z" fill="#7C5CBF" opacity="0.6"/>
      <path d="M54 14 Q52 19 54 22 Q56 19 54 14Z" fill="#7C5CBF" opacity="0.5"/>
      <path d="M26 58 Q24 63 26 66 Q28 63 26 58Z" fill="#9B7FD4" opacity="0.5"/>
      <path d="M54 58 Q52 63 54 66 Q56 63 54 58Z" fill="#9B7FD4" opacity="0.4"/>
      {/* Center glow */}
      <circle cx="40" cy="40" r="4" fill="#EDE0FF" opacity="0.7"/>
      {/* Sparkle dots */}
      <circle cx="52" cy="16" r="1.5" fill="#B8A0E8"/>
      <circle cx="62" cy="40" r="1.5" fill="#9B7FD4"/>
      <circle cx="28" cy="66" r="1.5" fill="#B8A0E8"/>
    </svg>
  );
}

function AnalyticsSVG() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Bar chart columns */}
      <rect x="8" y="44" width="10" height="22" rx="2" fill="#0F766E" opacity="0.6"/>
      <rect x="22" y="32" width="10" height="34" rx="2" fill="#0F766E" opacity="0.75"/>
      <rect x="36" y="20" width="10" height="46" rx="2" fill="#0F766E" opacity="0.9"/>
      <rect x="50" y="38" width="10" height="28" rx="2" fill="#0F766E" opacity="0.65"/>
      <rect x="64" y="28" width="10" height="38" rx="2" fill="#0F766E" opacity="0.8"/>
      {/* Trend line */}
      <polyline points="13,44 27,34 41,22 55,36 69,28"
        stroke="#14B8A6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Data points on trend */}
      <circle cx="13" cy="44" r="2.5" fill="#0F766E"/>
      <circle cx="27" cy="34" r="2.5" fill="#0F766E"/>
      <circle cx="41" cy="22" r="2.5" fill="#0F766E"/>
      <circle cx="55" cy="36" r="2.5" fill="#0F766E"/>
      <circle cx="69" cy="28" r="2.5" fill="#0F766E"/>
      {/* Flask/beaker overlay (top right) */}
      <path d="M56 6 L56 14 L50 24 L50 28 Q50 32 56 32 L62 32 Q68 32 68 28 L68 24 L62 14 L62 6Z"
        fill="#CCFBF1" stroke="#0F766E" strokeWidth="1.5" opacity="0.8"/>
      <rect x="54" y="4" width="10" height="3" rx="1" fill="#0F766E" opacity="0.6"/>
      {/* Liquid inside flask */}
      <path d="M51 26 Q50 28 50 28 Q50 32 56 32 L62 32 Q68 32 68 28 L68 26Z"
        fill="#0F766E" opacity="0.3"/>
      {/* Flask bubbles */}
      <circle cx="55" cy="28" r="1" fill="#14B8A6" opacity="0.7"/>
      <circle cx="59" cy="26" r="1.5" fill="#14B8A6" opacity="0.5"/>
      {/* X axis line */}
      <line x1="6" y1="67" x2="76" y2="67" stroke="#9B9590" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SkeletonBlock({ w = '100%', h = '20px', radius = '8px' }: { w?: string; h?: string; radius?: string }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: radius,
        background: 'linear-gradient(90deg, #EDE9E3 25%, #F5F3EF 50%, #EDE9E3 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accentColor: string;
  bgTint: string;
  onClick?: () => void;
  loading?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, accentColor, bgTint, onClick, loading }: KpiCardProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="kpi-card"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? accentColor + '40' : '#E8E4DE'}`,
        borderRadius: '16px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hovered ? SHADOW_HOVER : SHADOW_CARD,
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        textAlign: 'left',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label={label}
    >
      {/* Tinted corner radial */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '16px',
        background: `radial-gradient(circle at 100% 0%, ${bgTint} 0%, transparent 60%)`,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
      }} />

      {/* Animated bottom accent line */}
      <div
        className="kpi-accent-line"
        style={{
          background: accentColor,
          width: hovered ? '100%' : '32px',
        }}
      />

      <div className="kpi-card-inner" style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon row */}
        <div
          className="kpi-icon-row"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}
        >
          <div
            className="kpi-icon-box"
            style={{
              backgroundColor: bgTint,
              border: `1px solid ${accentColor}20`,
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <Icon size={17} style={{ color: accentColor }} />
          </div>
          {onClick && (
            <ChevronRight size={14} style={{
              color: accentColor,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }} />
          )}
        </div>

        {/* Number */}
        {loading ? (
          <SkeletonBlock w="60%" h="36px" radius="8px" />
        ) : (
          <p className="kpi-value">
            {value}
          </p>
        )}

        {/* Label */}
        <p className="kpi-label">
          {label}
        </p>

        {/* Sub */}
        {loading ? (
          <SkeletonBlock w="80%" h="12px" radius="4px" />
        ) : (
          <p className="kpi-sub">
            {sub}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Feature CTA Card ────────────────────────────────────────────────────────

interface CtaCardProps {
  svgIllustration: React.ReactNode;
  title: string;
  description: string;
  badge?: { label: string; bg: string; text: string };
  buttonLabel: string;
  buttonColor: string;
  buttonHover: string;
  bgAccent: string;
  onClick: () => void;
}

function CtaCard({
  svgIllustration, title, description, badge, buttonLabel,
  buttonColor, buttonHover, bgAccent, onClick,
}: CtaCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const [btnHovered, setBtnHovered] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? buttonColor + '30' : '#E8E4DE'}`,
        borderRadius: '16px',
        boxShadow: hovered ? SHADOW_HOVER : SHADOW_CARD,
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient background */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '16px',
        background: `linear-gradient(135deg, ${bgAccent} 0%, transparent 50%)`,
        opacity: hovered ? 0.6 : 0.3,
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
      }} />

      {/* Inner layout wrapper */}
      <div className="cta-card-inner">

      {/* SVG container */}
      <div
        className="cta-svg-container"
        style={{
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {svgIllustration}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{
            fontFamily: displayFont, fontSize: '17px', fontWeight: 700,
            color: '#1A1714', letterSpacing: '-0.01em',
          }}>
            {title}
          </h3>
          {badge && (
            <span style={{
              fontFamily: uiFont, fontSize: '11px', fontWeight: 600,
              padding: '2px 8px', borderRadius: '999px',
              backgroundColor: badge.bg, color: badge.text,
            }}>
              {badge.label}
            </span>
          )}
        </div>
        <p style={{
          fontFamily: uiFont, fontSize: '13px', color: '#5C5550',
          lineHeight: 1.55, marginBottom: '14px',
        }}>
          {description}
        </p>
        <button
          onClick={onClick}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            fontFamily: uiFont, fontSize: '13px', fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: btnHovered ? buttonHover : buttonColor,
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            cursor: 'pointer',
            boxShadow: `0 2px 6px ${buttonColor}50`,
            transition: 'all 0.15s ease',
            transform: btnHovered ? 'translateY(-1px)' : 'translateY(0)',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}
        >
          {buttonLabel}
          <ChevronRight size={13} />
        </button>
      </div>

      </div>{/* end cta-card-inner */}
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, children, action, minHeight,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  action?: { label: string; onClick: () => void }; minHeight?: string;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E4DE',
        borderRadius: '16px',
        display: 'flex', flexDirection: 'column',
        boxShadow: SHADOW_CARD,
        ...(minHeight ? { minHeight } : {}),
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 20px 0',
      }}>
        <h2 style={{
          fontFamily: displayFont, fontSize: '14px', fontWeight: 700,
          color: '#1A1714', display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <Icon size={14} style={{ color: '#8B1A2F' }} />
          {title}
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              fontFamily: uiFont, fontSize: '12px', fontWeight: 600,
              color: '#8B1A2F', padding: '4px 10px', borderRadius: '6px',
              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FDF2F4'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {action.label}
          </button>
        )}
      </div>
      <div style={{ flex: 1, padding: '16px 20px 20px' }}>{children}</div>
    </div>
  );
}

// ─── Circular Progress Ring ───────────────────────────────────────────────────

function CircularProgress({ pct, color, size = 80, strokeW = 7 }: {
  pct: number; color: string; size?: number; strokeW?: number;
}) {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5F3EF" strokeWidth={strokeW} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.7s ease' }}
      />
    </svg>
  );
}

// ─── Activity Feed Row ───────────────────────────────────────────────────────

function FeedRow({ dot, title, sub, right, rightSub }: {
  dot: string; title: string; sub?: string; right: string; rightSub?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 0',
      borderBottom: '1px solid #F5F3EF',
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        backgroundColor: dot, flexShrink: 0, marginTop: '1px',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: uiFont, fontSize: '13px', fontWeight: 500, color: '#1A1714', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        {sub && (
          <p style={{ fontFamily: uiFont, fontSize: '11px', color: '#9B9590', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </p>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: uiFont, fontSize: '13px', fontWeight: 500, color: '#1A1714' }}>{right}</p>
        {rightSub && <p style={{ fontFamily: uiFont, fontSize: '11px', color: '#9B9590' }}>{rightSub}</p>}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<DashboardStats>('/dashboard/stats'),
    refetchInterval: 30000,
  });

  const { data: lotsByType = [] } = useQuery({
    queryKey: ['lots-by-type'],
    queryFn: () => api<Array<{ type: string; count: string; total_volume: string }>>('/dashboard/lots-by-type'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api<{ movements: any[]; operations: any[] }>('/dashboard/recent-activity'),
  });

  const { data: volumeChart = [] } = useQuery({
    queryKey: ['volume-chart'],
    queryFn: () => api<Array<{ day: string; volume_in: string; volume_out: string }>>('/dashboard/volume-chart'),
  });

  // Derived values
  const totalContainers = Number(stats?.containers.total ?? 0);
  const usedContainers = Number(stats?.containers.in_use ?? 0);
  const containerPct = totalContainers > 0 ? Math.round((usedContainers / totalContainers) * 100) : 0;

  const pieData = lotsByType.map((item) => ({
    name: TYPE_LABELS[item.type] || item.type,
    value: Math.round(Number(item.total_volume)),
    count: Number(item.count),
    color: WINE_COLORS[item.type as keyof typeof WINE_COLORS] || '#6B7280',
  }));

  const chartData = volumeChart.slice(-14).map((d) => ({
    day: new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    entrée: Math.round(Number(d.volume_in)),
    sortie: Math.round(Number(d.volume_out)),
  }));

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayCapitalized = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  // ── GSAP entrance animations ──
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Header reveal
    tl.from('.dash-header', { y: -20, opacity: 0, duration: 0.5 });

    // KPI cards stagger
    tl.from('.kpi-card', {
      y: 24, opacity: 0, stagger: 0.08, duration: 0.5,
    }, '-=0.2');

    // Charts section reveal on scroll
    gsap.from('.dash-charts', {
      scrollTrigger: {
        trigger: '.dash-charts',
        start: 'top 85%',
        once: true,
      },
      y: 30, opacity: 0, duration: 0.6,
    });

    // Activity section
    gsap.from('.dash-activity', {
      scrollTrigger: {
        trigger: '.dash-activity',
        start: 'top 85%',
        once: true,
      },
      y: 30, opacity: 0, duration: 0.6, delay: 0.1,
    });
  }, { scope: dashboardRef, dependencies: [statsLoading] });

  return (
    <div ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Keyframe styles + responsive overrides ──────────────────────────── */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes float-barrel {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        /* ── KPI grid: 2 cols mobile, 4 cols desktop ── */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 767px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        /* ── KPI card responsive sizing ── */
        .kpi-value {
          font-family: 'Cabinet Grotesk', 'Satoshi', system-ui, sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #1A1714;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 2px;
        }
        .kpi-label {
          font-family: 'Satoshi', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #5C5550;
          margin-bottom: 4px;
        }
        .kpi-sub {
          font-family: 'Satoshi', system-ui, sans-serif;
          font-size: 12px;
          color: #9B9590;
          line-height: 1.4;
        }
        .kpi-card-inner {
          padding: 20px 20px 16px;
        }
        .kpi-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .kpi-accent-line {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          border-radius: 0 0 0 16px;
          transition: width 0.3s ease;
        }
        @media (max-width: 767px) {
          .kpi-value {
            font-size: 1.5rem;
            margin-bottom: 1px;
          }
          .kpi-label {
            font-size: 11px;
            margin-bottom: 2px;
          }
          .kpi-sub {
            font-size: 10px;
          }
          .kpi-card-inner {
            padding: 12px 14px 10px;
          }
          .kpi-icon-box {
            width: 28px;
            height: 28px;
            border-radius: 8px;
          }
          .kpi-icon-row {
            margin-bottom: 8px !important;
          }
          .kpi-accent-line {
            height: 2px;
          }
        }

        /* ── Hero section responsive ── */
        .hero-barrel {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 160px;
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          animation: float-barrel 4s ease-in-out infinite;
        }
        @media (max-width: 639px) {
          .hero-barrel {
            display: none;
          }
          .hero-section {
            padding: 20px 20px !important;
            min-height: 120px !important;
          }
          .hero-heading {
            font-size: 18px !important;
          }
        }

        /* ── CTA cards responsive ── */
        .cta-svg-container {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          transition: transform 0.2s ease;
        }
        .cta-card-inner {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        @media (max-width: 767px) {
          .cta-svg-container {
            display: none;
          }
          .cta-card-inner {
            padding: 16px;
            gap: 8px;
          }
          .cta-cards-list {
            gap: 8px !important;
          }
        }

        /* ── Analytics 2-column grid on large screens ── */
        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 1024px) {
          .analytics-grid {
            grid-template-columns: 2fr 1fr;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hero-section dash-header"
        style={{
          background: 'linear-gradient(135deg, #1A1714 0%, #2D1A20 45%, #3D1028 100%)',
          borderRadius: '20px',
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: SHADOW_ELEVATED,
          minHeight: '160px',
        }}
      >
        {/* Background texture lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.015) 40px,
            rgba(255,255,255,0.015) 41px
          )`,
          pointerEvents: 'none',
        }} />

        {/* Left content */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          {/* Date chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            marginBottom: '14px',
          }}>
            <span style={{
              fontFamily: uiFont, fontSize: '12px', fontWeight: 500,
              color: 'rgba(253,242,244,0.65)',
              padding: '4px 12px', borderRadius: '999px',
              border: '1px solid rgba(253,242,244,0.15)',
              background: 'rgba(253,242,244,0.07)',
            }}>
              {todayCapitalized}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontFamily: uiFont, fontSize: '12px', fontWeight: 600,
              color: '#4ADE80',
              padding: '4px 10px', borderRadius: '999px',
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.25)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: '#4ADE80',
                animation: 'pulse-dot 2s ease-in-out infinite',
                display: 'inline-block',
              }} />
              En ligne
            </span>
          </div>

          {/* Display heading */}
          <h1
            className="hero-heading"
            style={{
              fontFamily: displayFont,
              fontSize: 'clamp(22px, 2.5vw, 30px)',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: '8px',
            }}
          >
            Bienvenue dans votre Cuverie
          </h1>
          <p style={{
            fontFamily: uiFont, fontSize: '14px', fontWeight: 400,
            color: 'rgba(253,242,244,0.6)', lineHeight: 1.5,
            maxWidth: '440px',
          }}>
            Gérez, tracez et optimisez chaque lot de votre production
          </p>
        </div>

        {/* Right: Barrel illustration */}
        <div className="hero-barrel">
          <BarrelSVG />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. KPI STRIP — 4 cards
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="kpi-grid">
        <KpiCard
          icon={Wine} label="Lots actifs" accentColor="#8B1A2F" bgTint="#FDF2F4"
          loading={statsLoading}
          value={stats?.lots.active_lots ?? '—'}
          sub={`${Math.round(Number(stats?.lots.total_volume ?? 0)).toLocaleString('fr-FR')} L · ${stats?.lots.vintages_count ?? '0'} millésimes`}
          onClick={() => navigate('/lots')}
        />
        <KpiCard
          icon={Package} label="Contenants utilisés" accentColor="#D97706" bgTint="#FFFBEB"
          loading={statsLoading}
          value={`${containerPct}%`}
          sub={`${usedContainers}/${totalContainers} · ${stats?.containers.available ?? '0'} disponibles`}
          onClick={() => navigate('/containers')}
        />
        <KpiCard
          icon={ArrowLeftRight} label="Mouvements 30j" accentColor="#1D4ED8" bgTint="#EFF6FF"
          loading={statsLoading}
          value={stats?.movements_30d.count ?? '—'}
          sub={`${Math.round(Number(stats?.movements_30d.total_volume ?? 0)).toLocaleString('fr-FR')} L traités`}
          onClick={() => navigate('/movements')}
        />
        <KpiCard
          icon={Activity} label="Opérations actives" accentColor="#16A34A" bgTint="#F0FDF4"
          loading={statsLoading}
          value={stats?.operations.in_progress ?? '—'}
          sub={`${stats?.operations.planned ?? '0'} planifiées`}
          onClick={() => navigate('/operations')}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. FEATURE CTA CARDS — 3 horizontal cards
      ══════════════════════════════════════════════════════════════════════ */}
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
        <div>
          <h2 style={{
            fontFamily: displayFont, fontSize: '15px', fontWeight: 700,
            color: '#1A1714', letterSpacing: '-0.01em',
          }}>
            Fonctionnalités clés
          </h2>
          <p style={{ fontFamily: uiFont, fontSize: '12px', color: '#9B9590', marginTop: '2px' }}>
            Accédez rapidement aux outils de gestion de votre cuverie
          </p>
        </div>
        <div style={{
          width: '32px', height: '3px', borderRadius: '2px',
          background: 'linear-gradient(90deg, #8B1A2F, #D97706)',
        }} />
      </div>
      <div className="cta-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <CtaCard
          svgIllustration={<LotTraceSVG />}
          title="Lots & Traçabilité"
          description="Suivi complet de chaque lot de la vigne à la bouteille. Historique, généalogie et certification à portée de main."
          buttonLabel="Gérer les lots"
          buttonColor="#8B1A2F"
          buttonHover="#6F1526"
          bgAccent="#FDF2F4"
          onClick={() => navigate('/lots')}
        />
        <CtaCard
          svgIllustration={<AISparkleSVG />}
          title="Assemblage par IA"
          description="Algorithmes d'intelligence artificielle pour créer des assemblages parfaits, optimisés selon vos critères analytiques."
          badge={{ label: 'IA Powered', bg: '#EDE9FF', text: '#5B21B6' }}
          buttonLabel="Lancer l'assemblage"
          buttonColor="#7C3AED"
          buttonHover="#6D28D9"
          bgAccent="#F5F3FF"
          onClick={() => navigate('/assemblage')}
        />
        <CtaCard
          svgIllustration={<AnalyticsSVG />}
          title="Analyses & Qualité"
          description="Monitoring complet des paramètres analytiques de chaque cuvée. SO₂, pH, TAV, acidité — tout en temps réel."
          buttonLabel="Voir les analyses"
          buttonColor="#0F766E"
          buttonHover="#0D6661"
          bgAccent="#F0FDFA"
          onClick={() => navigate('/analyses')}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. ACTIVITY & STATS ROW — chart (2/3) + donut (1/3)
      ══════════════════════════════════════════════════════════════════════ */}
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
        <h2 style={{ fontFamily: displayFont, fontSize: '15px', fontWeight: 700, color: '#1A1714', letterSpacing: '-0.01em' }}>
          Analytics & Production
        </h2>
        <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: 'linear-gradient(90deg, #1D4ED8, #16A34A)' }} />
      </div>
      <div className="analytics-grid dash-charts">
        {/* Area chart */}
        <SectionCard title="Volume des mouvements — 14 derniers jours" icon={TrendingUp}>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashGradIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B1A2F" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#8B1A2F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashGradOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D97706" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#9B9590', fontSize: 10, fontFamily: uiFont }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9B9590', fontSize: 10, fontFamily: uiFont }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FDFCFA', border: '1px solid #E8E4DE',
                      borderRadius: '10px', fontSize: '12px', color: '#1A1714',
                      fontFamily: uiFont, boxShadow: SHADOW_CARD,
                    }}
                    labelStyle={{ color: '#5C5550', fontWeight: 600 }}
                    formatter={(v: number, name: string) => [`${v.toLocaleString('fr-FR')} L`, name]}
                  />
                  <Area type="monotone" dataKey="entrée" stroke="#8B1A2F" strokeWidth={2} fill="url(#dashGradIn)" dot={false} activeDot={{ r: 4, fill: '#8B1A2F' }} />
                  <Area type="monotone" dataKey="sortie" stroke="#D97706" strokeWidth={2} fill="url(#dashGradOut)" dot={false} activeDot={{ r: 4, fill: '#D97706' }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                {[{ c: '#8B1A2F', l: 'Entrée' }, { c: '#D97706', l: 'Sortie' }].map(({ c, l }) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '14px', height: '2px', borderRadius: '2px', backgroundColor: c }} />
                    <span style={{ fontFamily: uiFont, fontSize: '11px', color: '#9B9590' }}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: uiFont, fontSize: '13px', color: '#9B9590',
            }}>
              Aucune donnée disponible
            </div>
          )}
        </SectionCard>

        {/* Donut chart */}
        <SectionCard title="Répartition par type" icon={Wine}>
          {pieData.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={48} outerRadius={68}
                      dataKey="value" nameKey="name"
                      strokeWidth={3} stroke="#FDFCFA"
                      paddingAngle={2}
                    >
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#FDFCFA', border: '1px solid #E8E4DE',
                        borderRadius: '10px', fontSize: '12px', fontFamily: uiFont,
                      }}
                      formatter={(v: number) => [`${v.toLocaleString('fr-FR')} L`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {pieData.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: uiFont, fontSize: '12px', color: '#5C5550', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      <span style={{
                        fontFamily: uiFont, fontSize: '10px', padding: '1px 5px',
                        borderRadius: '999px', backgroundColor: '#F5F3EF', color: '#9B9590',
                      }}>
                        {item.count}
                      </span>
                    </div>
                    <span style={{ fontFamily: uiFont, fontSize: '12px', fontWeight: 500, color: '#1A1714', flexShrink: 0, marginLeft: '8px' }}>
                      {item.value.toLocaleString('fr-FR')} L
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: uiFont, fontSize: '13px', color: '#9B9590',
            }}>
              Aucun lot actif
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. BOTTOM ROW — capacity gauge + movements feed + operations feed
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="dash-activity" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        paddingBottom: '8px',
      }}>

        {/* Capacity gauge card */}
        <SectionCard title="Occupation des contenants" icon={Package}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Circular ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircularProgress pct={containerPct} color="#8B1A2F" size={86} strokeW={8} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: displayFont, fontSize: '18px', fontWeight: 700, color: '#1A1714' }}>
                  {containerPct}%
                </span>
              </div>
            </div>
            {/* Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Total', value: stats?.containers.total ?? '0', color: '#9B9590' },
                { label: 'En service', value: stats?.containers.in_use ?? '0', color: '#8B1A2F' },
                { label: 'Disponibles', value: stats?.containers.available ?? '0', color: '#16A34A' },
                { label: 'Maintenance', value: stats?.containers.in_maintenance ?? '0', color: '#B45309' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: uiFont, fontSize: '12px', color: '#9B9590' }}>{label}</span>
                  <span style={{ fontFamily: displayFont, fontSize: '14px', fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Recent movements */}
        <SectionCard
          title="Mouvements récents"
          icon={ArrowLeftRight}
          action={{ label: 'Voir tout', onClick: () => navigate('/movements') }}
        >
          {(!recentActivity?.movements || recentActivity.movements.length === 0) ? (
            <p style={{ fontFamily: uiFont, fontSize: '13px', color: '#9B9590', textAlign: 'center', paddingTop: '28px' }}>
              Aucun mouvement récent
            </p>
          ) : (
            <div>
              {recentActivity.movements.slice(0, 5).map((m: any, i: number) => (
                <FeedRow
                  key={i}
                  dot="#8B1A2F"
                  title={`${MOVEMENT_LABELS[m.movement_type] || m.movement_type}${m.lot_number ? ` · ${m.lot_number}` : ''}`}
                  sub={m.operator_name || 'Système'}
                  right={`${Number(m.volume_liters).toLocaleString('fr-FR')} L`}
                  rightSub={new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent operations */}
        <SectionCard
          title="Opérations récentes"
          icon={Activity}
          action={{ label: 'Voir tout', onClick: () => navigate('/operations') }}
        >
          {(!recentActivity?.operations || recentActivity.operations.length === 0) ? (
            <p style={{ fontFamily: uiFont, fontSize: '13px', color: '#9B9590', textAlign: 'center', paddingTop: '28px' }}>
              Aucune opération récente
            </p>
          ) : (
            <div>
              {recentActivity.operations.slice(0, 5).map((o: any, i: number) => {
                const statusMap = {
                  done: { bg: '#F0FDF4', text: '#15803D', label: 'Terminé' },
                  in_progress: { bg: '#FFFBEB', text: '#B45309', label: 'En cours' },
                  planned: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Planifié' },
                };
                const badge = statusMap[o.status as keyof typeof statusMap] || statusMap.planned;
                const dotColor = o.status === 'done' ? '#16A34A' : o.status === 'in_progress' ? '#D97706' : '#1D4ED8';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '9px 0', borderBottom: '1px solid #F5F3EF',
                  }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      backgroundColor: dotColor, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: uiFont, fontSize: '13px', fontWeight: 500,
                        color: '#1A1714', textTransform: 'capitalize',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {o.operation_type.replace(/_/g, ' ')}{o.lot_number ? ` · ${o.lot_number}` : ''}
                      </p>
                      {o.purpose && (
                        <p style={{
                          fontFamily: uiFont, fontSize: '11px', color: '#9B9590',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {o.purpose}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontFamily: uiFont, fontSize: '11px', fontWeight: 600,
                      padding: '3px 8px', borderRadius: '999px',
                      backgroundColor: badge.bg, color: badge.text,
                      flexShrink: 0,
                    }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

    </div>
  );
}
