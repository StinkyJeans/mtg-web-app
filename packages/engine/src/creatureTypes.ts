import type { CardDef } from "./types.js";

/** Every creature type (rule 205.3m), lowercase, one word each: what a changeling is. */
export const CREATURE_TYPES = `advisor aetherborn alien ally angel antelope ape archer archon armadillo army artificer assassin assembly-worker astartes atog
aurochs avatar azra badger balloon barbarian bard basilisk bat bear beast beaver beeble beholder berserker bird blinkmoth boar bringer brushwagg
camarid camel capybara caribou carrier cat centaur child chimera citizen cleric clown cockatrice construct coward coyote crab crocodile c'tan custodes
cyberman cyclops dalek dauthi demigod demon deserter detective devil dinosaur djinn doctor dog dragon drake dreadnought drix drone druid dryad dwarf
efreet egg elder eldrazi elemental elephant elf elk employee eye faerie ferret fish flagbearer fox fractal frog fungus gamer gargoyle germ giant gith
glimmer gnoll gnome goat goblin god golem gorgon graveborn gremlin griffin guest hag halfling hamster harpy hellion hippo hippogriff homarid homunculus
horror horse human hydra hyena illusion imp incarnation inkling inquisitor insect jackal jellyfish juggernaut kavu kirin kithkin knight kobold kor
kraken lamia lammasu leech leviathan lhurgoyf licid lizard llama lobster manticore masticore mercenary merfolk metathran minion minotaur mite mole
monger mongoose monk monkey moogle moonfolk mount mouse mutant myr mystic nautilus necron nephilim nightmare nightstalker ninja noble noggle nomad nymph
octopus ogre ooze orb orc orgg otter ouphe ox oyster pangolin peasant pegasus pentavite performer pest phelddagrif phoenix phyrexian pilot pincher
pirate plant porcupine possum praetor primarch prism processor qu rabbit raccoon ranger rat rebel reflection rhino rigger robot rogue sable salamander
samurai sand saproling satyr scarecrow scientist scion scorpion scout sculpture seal serf serpent servo shade shaman shapeshifter shark sheep siren
skeleton skunk slith sliver sloth slug snail snake soldier soltari spawn specter spellshaper sphinx spider spike spirit splinter sponge squid squirrel
starfish surrakar survivor synth tentacle tetravite thalakos thopter thrull tiefling toy treefolk trilobite triskelavite troll turtle tyranid unicorn
urzan vampire varmint vedalken volver wall walrus warlock warrior weasel weird werewolf whale wizard wolf wolverine wombat worm wraith wurm yeti
zombie zubera`.split(/\s+/);

/** The subtypes on a card's type line (lowercase): "Creature — Zombie Wizard" is ["zombie", "wizard"]. A changeling is every creature type, in every zone. */
export function defSubtypes(def: CardDef): string[] {
  const printed = ((def.typeLine ?? "").split(" // ")[0].split("—")[1] ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return (def.keywords ?? []).some((k) => k.toLowerCase() === "changeling") ? [...new Set([...printed, ...CREATURE_TYPES])] : printed;
}
