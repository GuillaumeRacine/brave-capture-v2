---
description: Autonomous subagent workflow - research, implement, test, debug, document
---

I need you to implement the following using the autonomous subagent workflow.

⚠️ IMPORTANT: CLARIFY BEFORE LAUNCHING SUBAGENTS
Before launching any subagents, you MUST:
1. Analyze the task for ambiguity or missing critical information
2. Use AskUserQuestion tool to clarify ANY unclear requirements:
   - Implementation approach if multiple valid options exist
   - Technical choices (which library, which protocol version, etc.)
   - Scope boundaries (what's included, what's not)
   - Priority if multiple features mentioned
3. Document all clarifications received
4. ONLY THEN launch subagents with complete, unambiguous instructions

Remember: Subagents CANNOT ask questions mid-execution. They are stateless and return a single final report.
If they need info, they'll have to make assumptions (bad) or fail (worse).
So YOU must gather all needed info FIRST, then give them complete instructions.

CRITICAL REQUIREMENTS:
1. Use subagents to research, implement, test, debug, and document autonomously
2. Chain subagents in sequence: Explore → Plan → Implement → Test → Debug → Document → Verify
3. NEVER ask user to test - test autonomously first using:
   - Automated test scripts (Node.js/Bash)
   - File reference checks (grep/find)
   - Database queries (test-*.js scripts)
   - Syntax validation (node --check)
   - Console log verification
4. ONLY involve user when testing is impossible without their environment:
   - Browser extension reload (cannot automate)
   - Visual verification (screenshot appearance)
   - User-specific environment issues
5. Minimize user effort - they should only reload/verify at the very end

WORKFLOW (Execute in sequence):

0. CLARIFY (BEFORE any subagents)
   - Analyze task for ambiguity
   - Use AskUserQuestion for ANY unclear aspects
   - Document all decisions and requirements
   - Prepare complete instructions for subagents

1. EXPLORE (subagent_type=Explore, thoroughness=very thorough)
   - Understand existing codebase structure
   - Identify all files that need changes
   - Map dependencies and integration points
   - Document current implementation
   - REPORT BACK if critical info missing (then main agent asks user)

2. PLAN (subagent_type=Plan, thoroughness=medium)
   - Create detailed implementation plan based on exploration
   - Identify test requirements and validation strategy
   - Plan documentation updates
   - Consider edge cases and error handling
   - DOCUMENT ALL ASSUMPTIONS made (if any)
   - REPORT BACK if multiple valid approaches exist (then main agent asks user)

3. IMPLEMENT (subagent_type=general-purpose)
   - Write/modify code according to plan
   - Update all file references
   - Ensure consistency across all affected files
   - Handle error cases

4. TEST (subagent_type=general-purpose)
   - Create automated test scripts (test-*.js, test-*.sh)
   - Run tests autonomously (Node.js, Bash)
   - Verify syntax (node --check *.js)
   - Check file references (grep, find)
   - Test database queries if applicable
   - Validate all changes work as expected

5. DEBUG (subagent_type=general-purpose, only if tests fail)
   - Analyze test failures
   - Fix issues found
   - Re-run tests until all passing
   - Document fixes applied

6. DOCUMENT (subagent_type=general-purpose)
   - Update CHANGELOG.md with version and changes
   - Update relevant .md files (README, guides, etc.)
   - Create troubleshooting guide if applicable
   - Update quick-start guides
   - Document all functions/changes inline

7. VERIFY (subagent_type=general-purpose)
   - Final comprehensive verification of all changes
   - Check all references updated correctly
   - Confirm no broken links or missing files
   - Validate documentation accuracy
   - Run final test suite

DELIVERABLE (Present to user):
- Clear summary of what was implemented
- Test results showing everything works (with proof)
- Simple 1-2 step instructions for final verification (e.g., "reload extension")
- Documentation references

REFERENCE DOCS:
- See SUBAGENT-WORKFLOW-PROMPT.md for detailed workflow documentation
- See HOW-TO-USE-SUBAGENT-WORKFLOW.md for usage examples

---

Task to implement:
