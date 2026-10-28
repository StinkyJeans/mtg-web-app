"use client";

import { powerOf, toughnessOf } from "@mtg/engine";
import type { GameState, PlayerId } from "@mtg/engine";
import { useState } from "react";
import type { CastPlan } from "./castInfo";
import { ManaText } from "./ManaSymbols";
import { ChoicePanel, XPanel } from "./ChoicePanels";

interface Props {
  state: GameState;
  actor: PlayerId;
  plan: CastPlan;
  modePick: number[];
  onModePick: (modes: number[]) => void;
  xValue: number;
  onX: (x: number) => void;
  onAdvance: (plan: CastPlan) => void;
  onCancel: () => void;
}

/** Teamwork: tap creatures with total power N or more as an additional cost (the spell then does more). */
function TeamworkPanel({ state, actor, plan, onAdvance, onCancel }: Pick<Props, "state" | "actor" | "plan" | "onAdvance" | "onCancel">) {
  const team = plan.castable.teamwork!;
  const [using, setUsing] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  if (!using) {
    return (
      <ChoicePanel
        title={`${plan.name} has teamwork ${team.n}`}
        options={[
          { label: "Cast it normally", onPick: () => onAdvance({ ...plan, teamwork: [] }) },
          { label: `Use teamwork: tap creatures with total power ${team.n} or more, and the spell does more`, onPick: () => setUsing(true) },
        ]}
        onCancel={onCancel}
      />
    );
  }
  const perms = team.options.map((iid) => state.players[actor].battlefield.find((p) => p.card.iid === iid)!);
  const total = picked.reduce((n, i) => n + Math.max(0, powerOf(state, perms[i])), 0);
  return (
    <ChoicePanel
      title={`Teamwork ${team.n}: choose creatures to tap (total power ${total} of ${team.n})`}
      options={perms.map((p) => ({ label: `${state.cards[p.card.defId].name} (power ${powerOf(state, p)})`, onPick: () => undefined }))}
      multi={{
        selected: picked,
        onToggle: (i) => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]),
        onDone: () => onAdvance({ ...plan, teamwork: picked.map((i) => perms[i].card.iid) }),
        canDone: total >= team.n,
      }}
      onCancel={onCancel}
    />
  );
}

/** Delve: graveyard cards to exile, each paying one generic mana. The cards best given up start out chosen. */
function DelvePanel({ state, actor, plan, onAdvance, onCancel }: Pick<Props, "state" | "actor" | "plan" | "onAdvance" | "onCancel">) {
  const delve = plan.castable.delve!;
  const [picked, setPicked] = useState<number[]>(() => delve.options.slice(0, delve.max).map((_, i) => i));
  const cards = delve.options.map((iid) => state.players[actor].graveyard.find((c) => c.iid === iid)!);
  return (
    <ChoicePanel
      title={`${plan.name} has delve: each card you exile from your graveyard pays one generic mana (${picked.length} chosen, ${delve.min > 0 ? `at least ${delve.min}, ` : ""}at most ${delve.max})`}
      options={cards.map((c) => ({ label: state.cards[c.defId].name, onPick: () => undefined }))}
      multi={{
        selected: picked,
        onToggle: (i) => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : picked.length < delve.max ? [...picked, i] : picked),
        onDone: () => onAdvance({ ...plan, delve: picked.map((i) => cards[i].iid) }),
        canDone: picked.length >= delve.min,
      }}
      onCancel={onCancel}
    />
  );
}

/** The question a spell being cast still needs answered, in order: modes, warp, the kicker (or offspring, or blight), X, delve, then a creature to sacrifice or a card to discard. */
export default function CastPlanPanels({ state, actor, plan, modePick, onModePick, xValue, onX, onAdvance, onCancel }: Props) {
  const c = plan.castable;
  const teamworkDone = c.teamwork === undefined || plan.teamwork !== undefined;
  const modesDone = !c.modal || plan.modes !== undefined;
  const warpDone = c.warp === undefined || plan.warp !== undefined;
  const kickerDone = (c.kicker === undefined && !c.blight) || plan.kicked !== undefined;
  const xDone = c.maxX === undefined || plan.x !== undefined;

  if (!teamworkDone) return <TeamworkPanel state={state} actor={actor} plan={plan} onAdvance={onAdvance} onCancel={onCancel} />;
  if (c.modal && !modesDone) {
    const max = c.modal.bothIfKicked && (plan.teamwork?.length ?? 0) > 0 ? 2 : c.modal.max;
    return (
      <ChoicePanel
        title={`${plan.name}: choose ${max === 1 ? "one" : "one or both"}`}
        options={c.modal.modes.map((m, i) => ({
          label: <ManaText text={m.text} />,
          disabled: !m.available,
          onPick: () => onAdvance({ ...plan, modes: [i] }),
        }))}
        multi={
          max > 1
            ? {
                selected: modePick,
                onToggle: (i) => onModePick(modePick.includes(i) ? modePick.filter((x) => x !== i) : modePick.length < max ? [...modePick, i] : modePick),
                onDone: () => onAdvance({ ...plan, modes: [...modePick].sort((a, b) => a - b) }),
              }
            : undefined
        }
        onCancel={onCancel}
      />
    );
  }
  if (!warpDone) {
    return (
      <ChoicePanel
        title={`${plan.name} has warp`}
        options={[
          { label: "Cast it normally", disabled: c.warpOnly, onPick: () => onAdvance({ ...plan, warp: false }) },
          { label: <>Cast it for its warp cost <ManaText text={c.warp ?? ""} />: it is exiled at the next end step, and you may cast it from exile on a later turn</>, onPick: () => onAdvance({ ...plan, warp: true }) },
        ]}
        onCancel={onCancel}
      />
    );
  }
  if (!kickerDone && c.blight) {
    const counters = c.blight.n === 1 ? "a -1/-1 counter" : `${c.blight.n} -1/-1 counters`;
    return (
      <ChoicePanel
        title={`${plan.name}: you may blight ${c.blight.n} (an additional cost)`}
        options={[
          { label: "Cast it normally", onPick: () => onAdvance({ ...plan, kicked: false }) },
          { label: `Blight ${c.blight.n}: put ${counters} on a creature you control`, onPick: () => onAdvance({ ...plan, kicked: true }) },
        ]}
        onCancel={onCancel}
      />
    );
  }
  if (!kickerDone) {
    const offspring = c.kickerName === "offspring";
    return (
      <ChoicePanel
        title={offspring ? `${plan.name} has offspring` : `${plan.name} has a kicker`}
        options={[
          { label: "Cast it normally", onPick: () => onAdvance({ ...plan, kicked: false }) },
          offspring
            ? { label: <>Pay offspring <ManaText text={c.kicker ?? ""} /> too: a 1/1 token copy enters with it</>, onPick: () => onAdvance({ ...plan, kicked: true }) }
            : { label: <>Cast it kicked, paying the extra <ManaText text={c.kicker ?? ""} /></>, onPick: () => onAdvance({ ...plan, kicked: true }) },
        ]}
        onCancel={onCancel}
      />
    );
  }
  if (c.blight && plan.kicked && plan.sacrifice === undefined) {
    return (
      <ChoicePanel
        title={`${plan.name}: choose a creature to blight`}
        options={c.blight.options.map((iid) => {
          const perm = state.players[actor].battlefield.find((p) => p.card.iid === iid)!;
          return { label: `${state.cards[perm.card.defId].name} (${powerOf(state, perm)}/${toughnessOf(state, perm)})`, onPick: () => onAdvance({ ...plan, sacrifice: iid }) };
        })}
        onCancel={onCancel}
      />
    );
  }
  if (!xDone) {
    return <XPanel name={plan.name} max={c.maxX ?? 0} x={xValue} onChange={(x) => onX(Math.min(c.maxX ?? 0, Math.max(0, x)))} onCast={() => onAdvance({ ...plan, x: xValue })} onCancel={onCancel} />;
  }
  if (c.delve && plan.delve === undefined) return <DelvePanel state={state} actor={actor} plan={plan} onAdvance={onAdvance} onCancel={onCancel} />;
  if (plan.sacrifice !== undefined) return null;
  if (c.sacrifice) {
    return (
      <ChoicePanel
        title={`${plan.name}: choose a creature to sacrifice${c.orPay ? ", or pay the extra mana" : ""} (an additional cost)`}
        options={[
          ...c.sacrifice.map((iid) => {
            const perm = state.players[actor].battlefield.find((p) => p.card.iid === iid)!;
            return { label: `${state.cards[perm.card.defId].name} (${powerOf(state, perm)}/${toughnessOf(state, perm)})`, onPick: () => onAdvance({ ...plan, sacrifice: iid }) };
          }),
          ...(c.orPay ? [{ label: <>Pay <ManaText text={c.orPay} /> instead</>, onPick: () => onAdvance({ ...plan, sacrifice: "pay" }) }] : []),
        ]}
        onCancel={onCancel}
      />
    );
  }
  if (c.discard) {
    return (
      <ChoicePanel
        title={`${plan.name}: choose a card to discard (an additional cost)`}
        options={c.discard.map((iid) => {
          const card = state.players[actor].hand.find((h) => h.iid === iid)!;
          return { label: state.cards[card.defId].name, onPick: () => onAdvance({ ...plan, sacrifice: iid }) };
        })}
        onCancel={onCancel}
      />
    );
  }
  return null;
}
