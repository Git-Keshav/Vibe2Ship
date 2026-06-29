import React, { useId } from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  lightBg?: boolean;
}

export default function AppLogo({ className = '', size = 48, lightBg = false }: AppLogoProps) {
  const uniqueId = useId();
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      style={{ width: size, height: size }}
    >
      <defs>
        {/* App Icon Background Gradients */}
        <radialGradient id={`${uniqueId}-app-bg`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#408a5c" />
          <stop offset="60%" stopColor="#215938" />
          <stop offset="100%" stopColor="#113620" />
        </radialGradient>

        <radialGradient id={`${uniqueId}-app-bg-light`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>

        <linearGradient id={`${uniqueId}-app-border`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#55a574" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#05140b" stopOpacity={0.5} />
        </linearGradient>

        <linearGradient id={`${uniqueId}-app-border-light`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.5} />
        </linearGradient>

        {/* Metallic Bezel Gradients */}
        <linearGradient id={`${uniqueId}-bezel-outer`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4d8ca" />
          <stop offset="15%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#9ea591" />
          <stop offset="75%" stopColor="#e8ebe1" />
          <stop offset="100%" stopColor="#6a705e" />
        </linearGradient>

        <linearGradient id={`${uniqueId}-bezel-inner`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b6bcad" />
          <stop offset="50%" stopColor="#737965" />
          <stop offset="100%" stopColor="#44493b" />
        </linearGradient>

        <linearGradient id={`${uniqueId}-bezel-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#aeb5a2" />
          <stop offset="100%" stopColor="#e3e6da" />
        </linearGradient>

        {/* Clock Face Gradient */}
        <radialGradient id={`${uniqueId}-face-grad`} cx="45%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="85%" stopColor="#f2efe4" />
          <stop offset="100%" stopColor="#d8d3c2" />
        </radialGradient>

        {/* Inner Shadow for Clock Face Depth */}
        <radialGradient id={`${uniqueId}-inner-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="88%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.35} />
        </radialGradient>

        {/* Magnifying Glass Handle Metallic Body */}
        <linearGradient id={`${uniqueId}-handle-body`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2a3d31" />
          <stop offset="25%" stopColor="#90aba0" />
          <stop offset="50%" stopColor="#3c5245" />
          <stop offset="80%" stopColor="#698576" />
          <stop offset="100%" stopColor="#1a2b21" />
        </linearGradient>

        {/* Glass Reflection / Glare */}
        <linearGradient id={`${uniqueId}-glare`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
        </linearGradient>

        {/* Drop Shadows */}
        <filter id={`${uniqueId}-shadow-main`} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx={0} dy={12} stdDeviation={15} floodColor="#000000" floodOpacity={0.6} />
        </filter>

        <filter id={`${uniqueId}-shadow-bezel`} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx={3} dy={8} stdDeviation={8} floodColor="#041208" floodOpacity={0.65} />
        </filter>

        <filter id={`${uniqueId}-shadow-hands`}>
          <feDropShadow dx={2} dy={4} stdDeviation={3} floodColor="#000000" floodOpacity={0.35} />
        </filter>
      </defs>

      {/* Green/Light App Icon Box */}
      <g filter={`url(#${uniqueId}-shadow-main)`}>
        <rect x="56" y="56" width="400" height="400" rx="90" fill={lightBg ? `url(#${uniqueId}-app-bg-light)` : `url(#${uniqueId}-app-bg)`} />
        {/* App Icon Subtle Inner Glow/Border */}
        <rect x="56" y="56" width="400" height="400" rx="90" fill="none" stroke={lightBg ? `url(#${uniqueId}-app-border-light)` : `url(#${uniqueId}-app-border)`} strokeWidth="3" />
      </g>

      {/* =============================== */}
      {/* MAGNIFYING GLASS HANDLE & GEM   */}
      {/* =============================== */}
      <g transform="translate(365, 365) rotate(-45)">
        {/* Shadow for the handle */}
        <rect x="-20" y="0" width="40" height="120" rx="10" fill="#000000" opacity={0.4} filter="blur(6px)" transform="translate(4, 8)" />

        {/* Connector to the bezel */}
        <rect x="-14" y="0" width="28" height="40" fill="#6d7866" />

        {/* Main Handle Body */}
        <rect x="-22" y="25" width="44" height="80" rx="4" fill={`url(#${uniqueId}-handle-body)`} />

        {/* Handle Ridges (Details) */}
        <line x1="-22" y1="35" x2="22" y2="35" stroke="#1d2d24" strokeWidth="2" />
        <line x1="-22" y1="95" x2="22" y2="95" stroke="#1d2d24" strokeWidth="2" />

        {/* Faceted Crystal Diamond Tip */}
        <g transform="translate(0, 0)">
          {/* Bottom Left Facet */}
          <polygon points="-25,118 0,118 0,146" fill="#9db8b7" />
          {/* Bottom Right Facet */}
          <polygon points="25,118 0,118 0,146" fill="#7d9c9a" />

          {/* Crystal Facet Edge Highlights */}
          <polyline points="-25,118 0,118 25,118" fill="none" stroke="#ffffff" strokeWidth={1.5} opacity={0.7} />
          <line x1="0" y1="118" x2="0" y2="146" stroke="#ffffff" strokeWidth={1.5} opacity={0.5} />
        </g>
      </g>

      {/* =============================== */}
      {/* CLOCK BODY AND FACE             */}
      {/* =============================== */}
      <g filter={`url(#${uniqueId}-shadow-bezel)`}>
        {/* Outer Bezel Base */}
        <circle cx="256" cy="256" r="168" fill={`url(#${uniqueId}-bezel-outer)`} />
      </g>

      {/* Outer Bezel Highlight Edge */}
      <circle cx="256" cy="256" r="166" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.6" />

      {/* Inner Bezel Slope */}
      <circle cx="256" cy="256" r="154" fill={`url(#${uniqueId}-bezel-inner)`} />

      {/* Inner Rim Separator */}
      <circle cx="256" cy="256" r="147" fill={`url(#${uniqueId}-bezel-rim)`} />

      {/* Clock Face Background */}
      <circle cx="256" cy="256" r="145" fill={`url(#${uniqueId}-face-grad)`} />

      {/* Clock Face Depth/Inner Shadow */}
      <circle cx="256" cy="256" r="145" fill={`url(#${uniqueId}-inner-shadow)`} />

      {/* =============================== */}
      {/* CLOCK TICKS / MARKS             */}
      {/* =============================== */}
      <g fill="#173123" stroke="#173123">
        {/* 12, 3, 6, 9 (Thick Ticks) */}
        <line x1="256" y1="123" x2="256" y2="143" strokeWidth="8" strokeLinecap="round" transform="rotate(0 256 256)" />
        <line x1="256" y1="123" x2="256" y2="143" strokeWidth="8" strokeLinecap="round" transform="rotate(90 256 256)" />
        <line x1="256" y1="123" x2="256" y2="143" strokeWidth="8" strokeLinecap="round" transform="rotate(180 256 256)" />
        <line x1="256" y1="123" x2="256" y2="143" strokeWidth="8" strokeLinecap="round" transform="rotate(270 256 256)" />

        {/* Secondary Ticks */}
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(30 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(60 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(120 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(150 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(210 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(240 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(300 256 256)" />
        <line x1="256" y1="126" x2="256" y2="139" strokeWidth="4" strokeLinecap="round" transform="rotate(330 256 256)" />
      </g>

      {/* =============================== */}
      {/* CLOCK HANDS                     */}
      {/* =============================== */}
      <g filter={`url(#${uniqueId}-shadow-hands)`}>
        {/* Hour Hand (~10:10, pointing at 10) */}
        <line x1="256" y1="268" x2="256" y2="175" stroke="#163625" strokeWidth="11" strokeLinecap="round" transform="rotate(305 256 256)" />

        {/* Minute Hand (pointing exactly at 2) */}
        <line x1="256" y1="268" x2="256" y2="138" stroke="#163625" strokeWidth="9" strokeLinecap="round" transform="rotate(60 256 256)" />

        {/* Second Hand (pointing at 7) */}
        <line x1="256" y1="285" x2="256" y2="122" stroke="#11291b" strokeWidth="3" strokeLinecap="round" transform="rotate(210 256 256)" />

        {/* Center Hub Pin */}
        <circle cx="256" cy="256" r="14" fill="#143222" />
        <circle cx="256" cy="256" r="5" fill="#698575" />
      </g>

      {/* =============================== */}
      {/* GLASS REFLECTION & GLARE        */}
      {/* =============================== */}
      <g opacity="0.85">
        <path d="M 115 235 A 141 141 0 0 1 397 235 A 155 125 0 0 0 115 235 Z" fill={`url(#${uniqueId}-glare)`} transform="rotate(-18 256 256)" />
      </g>

      {/* Edge Rim Light for the Glass Dome */}
      <circle cx="256" cy="256" r="144" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}
