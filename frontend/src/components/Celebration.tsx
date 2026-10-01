import { useEffect, useRef, useState } from 'react';
import { Text, Title, UnstyledButton } from '@mantine/core';
import type { CSSProperties } from 'react';
import { DARK_CARD } from './ui';
import './celebration.css';

const EMOJIS = ['🎉', '🥳', '🎊', '✨', '🎈'];
const COUNT = 36;
const DURATION_MS = 5200;

type Particle = { id: number; emoji: string; style: CSSProperties };

// Randomness lives in the click, not in render: re-rendering must not make the
// confetti jump around mid-flight.
const makeParticles = (): Particle[] =>
  Array.from({ length: COUNT }, (_, id) => ({
    id,
    emoji: EMOJIS[id % EMOJIS.length],
    style: {
      left: `${Math.random() * 94}%`,
      fontSize: 24 + Math.random() * 22,
      '--dur': `${2.6 + Math.random() * 1.8}s`,
      '--delay': `${Math.random() * 0.9}s`,
      '--sway': `${(Math.random() - 0.5) * 140}px`,
      '--spin': `${(Math.random() - 0.5) * 120}deg`,
    } as CSSProperties,
  }));

/** The empty state of the debts cards: nothing owed, so a card that is worth a click. */
export function Celebration({ title }: { title: string }) {
  const [party, setParty] = useState<Particle[]>([]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const celebrate = () => {
    // Clear first so a second click restarts the animations instead of
    // leaving the running ones where they are.
    setParty([]);
    requestAnimationFrame(() => setParty(makeParticles()));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setParty([]), DURATION_MS);
  };

  return (
    <>
      <UnstyledButton onClick={celebrate} w="100%" mb="lg" p="lg" bg="var(--gf-ink)" style={{ ...DARK_CARD, borderRadius: 'var(--mantine-radius-xl)', display: 'block' }}>
        <Title order={3} c="#fff" fz={22}>{title}</Title>
        <Text size="sm" c="#A9C7BD" mt={6}>Toque aqui para comemorar.</Text>
      </UnstyledButton>
      <div aria-hidden="true">
        {party.map((p) => (
          <span key={p.id} className="party" style={p.style}>{p.emoji}</span>
        ))}
      </div>
    </>
  );
}
