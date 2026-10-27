/** Request tickets are invalid after another load starts or the session changes. */
export function createLoadGuard() {
  let epoch=0,sequence=0;
  return {
    reset(){epoch++;sequence=0},
    begin(){return {epoch,sequence:++sequence}},
    isCurrent(ticket){return ticket.epoch===epoch&&ticket.sequence===sequence}
  };
}
/** Revisioned records, including tombstones, never move backwards on GET/PUT races. */
export function mergeCheckins(current=[],incoming=[]) {
  const records=new Map();
  for(const log of [...current,...incoming]) {
    const key=JSON.stringify([log.habit_id,log.habit_date]),old=records.get(key);
    if(!old||Number(log.revision||0)>=Number(old.revision||0))records.set(key,{...old,...log});
  }
  return [...records.values()];
}
