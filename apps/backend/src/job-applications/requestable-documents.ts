/**
 * The documents a reviewer can ask an applicant to (re-)upload.
 *
 * Keyed to the slots on `JobApplicationDocuments`, so a request names a real place the
 * file will land rather than a free-text wish. `other` is the escape hatch: anything not
 * on this list is described in the accompanying message instead.
 *
 * The frontend mirrors this list for its labels (src/lib/jobWorkflow.ts) — keep the two
 * in sync. It lives here as well because the API validates what it is sent: a request
 * naming a document slot that does not exist would be a prompt the applicant could never
 * satisfy.
 */
export const REQUESTABLE_JOB_DOCUMENTS = [
  'applicationLetter',
  'cv',
  'nationalId',
  'criminalRecord',
  'academicPapers',
  'goodConductCertificate',
  'employerRecommendation',
  'other',
] as const;

export type RequestableJobDocument = (typeof REQUESTABLE_JOB_DOCUMENTS)[number];
