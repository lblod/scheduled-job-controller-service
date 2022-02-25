import flatten from 'lodash.flatten';

export class Delta {

  constructor(delta) {
    this.delta = delta;
  }

  /**
   * Returns a flattened list of all change-set inserts
   *
   * @returns [{graph, subject, predicate, object}]
   */
  get inserts() {
    return flatten(this.delta.map(changeSet => changeSet.inserts));
  }

  /**
   * Returns a flattened list of all change-set deletes
   *
   * @returns [{graph, subject, predicate, object}]
   */
  get deletes() {
    return flatten(this.delta.map(changeSet => changeSet.deletes));
  }

  hasInsertsFor(
      subject = undefined,
      predicate = undefined,
      object = undefined) {
    return this.getInsertsFor(subject, predicate, object).length > 0;
  }

  getInsertsFor(
      subject = undefined,
      predicate = undefined,
      object = undefined) {
    return this.getChangesFor(this.inserts, subject, predicate, object);
  }

  hasDeletesFor(
      subject = undefined,
      predicate = undefined,
      object = undefined) {
    return this.getDeletesFor(subject, predicate, object).length > 0;
  }

  getDeletesFor(
      subject = undefined,
      predicate = undefined,
      object = undefined) {
    return this.getChangesFor(this.deletes, subject, predicate, object);
  }

  getChangesFor(changeSet, s = undefined, p = undefined, o = undefined) {
    s = getValue(s);
    p = getValue(p);
    o = getValue(o);

    return changeSet.filter(({subject, predicate, object}) => {
      const sMatch = !s || subject.value === s;
      const pMatch = !p || predicate.value === p;
      const oMatch = !o || object.value === o;
      return sMatch && pMatch && oMatch;
    });
  }
}

function getValue(obj) {
  if (obj !== undefined && !(typeof obj === 'string' || obj instanceof String))
    return obj.value;
  return obj;
}