import './Logo.css';

interface LogoProps {
  size?: 'sm' | 'lg';
  /** Renders the mark only (used in tight toolbars). */
  markOnly?: boolean;
}

/** The MultiView brand mark: a 2×2 wall of panels. */
export function Logo({ size = 'sm', markOnly = false }: LogoProps) {
  return (
    <span className={`logo logo--${size}`}>
      <span className="logo__mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {!markOnly && <span className="logo__word">MultiView</span>}
    </span>
  );
}
