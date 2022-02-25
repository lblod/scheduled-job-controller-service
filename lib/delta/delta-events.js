import {Delta} from './delta';

export class DeltaEvents {

  /**
   * Events that we are interested in
   */
  events;

  /**
   * @param events [[title: string, event: Object]]
   */
  constructor(events) {
    this.events = events;
  }

  /**
   * Process incoming delta with events it matches to
   *
   * @param delta
   * @returns {Promise<void>}
   */
  async process(delta) {
    if (!(delta instanceof Delta)) {
      await this.process(new Delta(delta));
      return;
    }
    for(let [title, event] of this.events) {
      if (event.isMatch(delta)) {
        console.info(`DeltaEvent: Delta match for [${title}], processing ...`)
        await event.process(delta);
      }
    }
  }
}