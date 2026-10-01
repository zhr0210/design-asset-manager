# Promoted Candidates Leave Active Review but Keep History

After Candidate Promotion, the candidate should leave the default Capture
Inbox review list and become a Promoted Candidate Record rather than remaining
an Active Candidate. The record should stay reachable from Capture Batch,
Asset Inspector source or history context, and appropriate Candidate History
filters so source traceability, promotion evidence, and short-lived Undo
Promote remain possible without making promoted items look like pending review
work.

ADR 0447 excludes that Promoted Candidate Record and every other Candidate
History record from Duplicate Text Evaluation Scope; only a current value owner
can contribute an occurrence.

ADR 0478 likewise excludes Promoted Candidate Records and Candidate History
from Missing initialization. Promotion creates a different current Design
Asset owner; a frozen plan never follows the Promotion Link or initializes that
replacement identity.
