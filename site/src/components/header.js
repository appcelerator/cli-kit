import React from 'react';
import { Link } from 'gatsby';

const Header = ({ siteTitle }) => (
  <div
    style={{
      background: '#aaa',
      marginBottom: '1.45rem',
	  textShadow: '0 2px 5px rgba(0,0,0,0.6)'
    }}
  >
    <div
      style={{
        margin: '0 auto',
        maxWidth: 960,
        padding: '1.45rem 1.0875rem',
      }}
    >
      <h1 style={{ margin: 0 }}>
        <Link
          to="/"
          style={{
            color: 'white',
            textDecoration: 'none',
          }}
        >
          {siteTitle}
        </Link>
      </h1>
    </div>
  </div>
)

export default Header
