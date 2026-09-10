/**
 * Imagine RPG — system entry point.
 *
 * PLACEHOLDER STUB. Actor data model schemas below are intentionally empty.
 * Real schema design (Attributes, derived stats, skills, the sourcebook-tagged
 * content layer, ActiveEffect wiring) is Layer 0 work tracked in
 * docs/PROGRESS.md (Epic 1) — deliberately deferred out of this pass.
 * This file exists only to make the manifest's documentTypes loadable so the
 * system can be installed and a world created without erroring.
 */

class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
  }
}

class CreatureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
  }
}

Hooks.once("init", () => {
  console.log("Imagine RPG | Initializing system (placeholder data models only)");

  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.creature = CreatureData;
});
