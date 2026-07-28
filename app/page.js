export default function Home() {
  return (
    <div className="wrap">
      <div className="awning" />
      <div className="header">
        <div className="eyebrow">Coup d'Œil</div>
        <h1 className="title">La carte de votre restaurant, en photos</h1>
        <p className="sub">
          <a className="btn" href="/admin" style={{ display: 'inline-block', textDecoration: 'none', marginRight: 10 }}>
            Espace restaurateur
          </a>
          <a className="btn ghost" href="/menu" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Voir la carte (vue client)
          </a>
        </p>
      </div>
    </div>
  );
}
