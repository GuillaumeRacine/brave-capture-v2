# Subagent Workflow Prompt Template

## Purpose
This template creates a complete autonomous workflow that chains subagents to research, implement, test, debug, and document code changes WITHOUT requiring user intervention until all testing is complete.

---

## 🤖 Master Prompt Template

```
I need you to implement [FEATURE/FIX DESCRIPTION] using the subagent workflow.

CRITICAL REQUIREMENTS:
1. Use subagents to research, implement, test, debug, and document autonomously
2. Chain subagents in sequence: Explore → Plan → Implement → Test → Debug → Document
3. NEVER ask user to test - test autonomously first and check that the data is correct, live and not stale or mocked up. 
4. ONLY involve user when testing is impossible without their environment
5. Minimize user effort - they should only reload/verify at the very end
6. 

WORKFLOW:
1. EXPLORE (subagent_type=Explore, thoroughness=very thorough)
   - Understand existing codebase
   - Research best practices and debate the relative value of the 1-3 best approaches, then pick one to plan for.
   - Identify all files that need changes
   - Map dependencies and integration points
   - Map changes to document files for humans and llms for comprhensive and relevant context to keep. 

2. PLAN (subagent_type=Plan, thoroughness=medium)
   - Create detailed implementation plan
   - Identify test requirements
   - Plan validation strategy

3. IMPLEMENT (subagent_type=general-purpose)
   - Write/modify code
   - Update all references
   - Ensure consistency across files

4. TEST (subagent_type=general-purpose)
   - Create automated test scripts
   - Run tests autonomously
   - Validate changes work as expected

5. DEBUG (subagent_type=general-purpose, only if tests fail)
   - Analyze test failures
   - Fix issues found
   - Re-run tests until passing

6. DOCUMENT (subagent_type=general-purpose)
   - Update all .md files
   - Document changes in CHANGELOG.md
   - Add troubleshooting guide
   - Update quick-start guides

7. VERIFY (subagent_type=general-purpose)
   - Final comprehensive verification
   - Check all references updated
   - Confirm no broken links
   - Validate documentation accuracy

DELIVERABLE:
Present user with:
- Summary of what was done
- Test results showing everything works
- Simple 1-2 step instructions for final verification (e.g., "reload extension")
- Documentation references

Feature/Fix to implement: [DESCRIBE HERE]
```

---

## 📋 Example Usage Scenarios

### Example 1: Add New Feature

```
I need you to implement automatic screenshot comparison using the subagent workflow.

CRITICAL REQUIREMENTS:
1. Use subagents to research, implement, test, debug, and document autonomously
2. Chain subagents in sequence: Explore → Plan → Implement → Test → Debug → Document
3. NEVER ask user to test - test autonomously first
4. ONLY involve user when testing is impossible without their environment
5. Minimize user effort - they should only reload/verify at the very end

WORKFLOW:
[Use full workflow template above]

Feature to implement: Add screenshot comparison feature that detects visual changes between consecutive captures of the same position.
```

### Example 2: Fix Bug

```
I need you to fix the timestamp mismatch causing database updates to fail using the subagent workflow.

CRITICAL REQUIREMENTS:
1. Use subagents to research, implement, test, debug, and document autonomously
2. Chain subagents in sequence: Explore → Plan → Implement → Test → Debug → Document
3. NEVER ask user to test - test autonomously first
4. ONLY involve user when testing is impossible without their environment
5. Minimize user effort - they should only reload/verify at the very end

WORKFLOW:
[Use full workflow template above]

Bug to fix: Database updates fail because capture timestamp doesn't exactly match position timestamp in database.
```

### Example 3: Refactor Code

```
I need you to refactor the pair matching logic to support multiple protocols using the subagent workflow.

CRITICAL REQUIREMENTS:
1. Use subagents to research, implement, test, debug, and document autonomously
2. Chain subagents in sequence: Explore → Plan → Implement → Test → Debug → Document
3. NEVER ask user to test - test autonomously first
4. ONLY involve user when testing is impossible without their environment
5. Minimize user effort - they should only reload/verify at the very end

WORKFLOW:
[Use full workflow template above]

Refactor goal: Make pair matching protocol-agnostic and extensible for future protocols.
```

---

## 🔧 Subagent Chaining Strategy

### Sequential Workflow (Recommended for Most Tasks)

```javascript
// Conceptual representation
async function autonomousWorkflow(task) {
  // 1. EXPLORE
  const codebaseKnowledge = await exploreAgent({
    task: "Understand codebase structure for " + task,
    thoroughness: "very thorough"
  });

  // 2. PLAN
  const implementationPlan = await planAgent({
    task: "Create implementation plan based on exploration",
    context: codebaseKnowledge,
    thoroughness: "medium"
  });

  // 3. IMPLEMENT
  const implementation = await generalAgent({
    task: "Implement changes according to plan",
    plan: implementationPlan
  });

  // 4. TEST
  const testResults = await generalAgent({
    task: "Create and run automated tests",
    code: implementation
  });

  // 5. DEBUG (conditional)
  if (testResults.failed) {
    const fixes = await generalAgent({
      task: "Debug and fix failing tests",
      failures: testResults.errors
    });
    // Repeat test after fixes
  }

  // 6. DOCUMENT
  const documentation = await generalAgent({
    task: "Update all documentation and changelogs",
    changes: implementation
  });

  // 7. VERIFY
  const finalCheck = await generalAgent({
    task: "Comprehensive verification of all changes",
    scope: "all files"
  });

  return {
    summary: "What was done",
    testResults: "All tests passing",
    userActions: ["Reload extension", "Verify dashboard"],
    documentation: ["CHANGELOG.md", "README.md"]
  };
}
```

### Parallel Workflow (For Independent Tasks)

```
Use parallel subagents when tasks are independent:
- Updating multiple protocol parsers
- Creating multiple test scripts
- Documenting multiple features

Example:
"Launch 3 subagents in parallel to update Orca, Raydium, and Aerodrome parsers"
```

---

## 🎯 Testing Requirements

### CRITICAL: Autonomous Testing First

**LLM MUST:**
1. ✅ Create test scripts that can run without user input
2. ✅ Run tests using Node.js/Bash to validate changes
3. ✅ Verify database queries work (using test-*.js scripts)
4. ✅ Check file references are correct (using grep/find)
5. ✅ Validate syntax (using node --check)
6. ✅ Test API integrations (using mock data if needed)

**LLM MUST NOT:**
1. ❌ Ask user to test before autonomous testing complete
2. ❌ Request user to check console before running own checks
3. ❌ Ask user to verify files exist before using Read tool
4. ❌ Request user to run commands that LLM can run

**ONLY Involve User When:**
- Browser extension reload required (cannot be automated)
- User-specific credentials needed (API keys, etc.)
- Visual verification needed (screenshot appearance)
- User-specific environment issue detected

### Test Script Patterns

**Database Tests:**
```javascript
// test-feature.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFeature() {
  console.log('🧪 Testing feature...');

  // Test database query
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Test passed');
}

testFeature();
```

**File Reference Tests:**
```bash
# test-references.sh
echo "🧪 Testing file references..."

# Check for broken references
grep -r "dashboard-v2" . && echo "❌ Found old references" || echo "✅ No old references"

# Check files exist
test -f dashboard.html && echo "✅ dashboard.html exists" || echo "❌ Missing file"
test -f dashboard.js && echo "✅ dashboard.js exists" || echo "❌ Missing file"

echo "✅ All reference tests passed"
```

**Syntax Tests:**
```bash
# test-syntax.sh
echo "🧪 Testing JavaScript syntax..."

for file in *.js; do
  node --check "$file" && echo "✅ $file" || echo "❌ $file has syntax errors"
done
```

---

## 📚 Documentation Requirements

### Every Change Must Include:

1. **CHANGELOG.md Update**
   ```markdown
   ## [VERSION] - DATE - FEATURE_NAME

   ### Added
   - New feature X

   ### Modified
   - File Y (lines A-B)

   ### Fixed
   - Issue Z

   ### Technical Details
   - Implementation specifics
   ```

2. **README.md Update** (if user-facing)
   - New features
   - Changed commands
   - Updated screenshots

3. **Technical Documentation** (AI-VISION-COMPLETE.md, etc.)
   - Architecture changes
   - API changes
   - Integration points

4. **Quick Reference Update** (QUICK-START.md)
   - New functions
   - Changed file locations
   - Updated workflows

5. **Troubleshooting Guide** (FIX-*.md)
   - Common issues
   - Solutions
   - Prevention tips

---

## 🚦 Quality Gates

Before presenting to user, verify:

### Code Quality
- [ ] All syntax valid (node --check)
- [ ] All references updated (grep verification)
- [ ] No console errors in tests
- [ ] No hardcoded credentials

### Testing
- [ ] Automated tests created
- [ ] All tests passing
- [ ] Edge cases covered
- [ ] Error handling tested

### Documentation
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if needed)
- [ ] Technical docs updated
- [ ] Troubleshooting guide created

### Integration
- [ ] No broken file references
- [ ] All dependencies resolved
- [ ] Database schema compatible
- [ ] API contracts maintained

### User Experience
- [ ] Clear summary of changes
- [ ] Simple verification steps (1-2 max)
- [ ] Documentation references provided
- [ ] Rollback instructions (if major change)

---

## 💡 Tips for Effective Prompts

### DO:
✅ Be specific about the feature/fix
✅ Mention "using the subagent workflow"
✅ Include the CRITICAL REQUIREMENTS section
✅ Reference this template
✅ Specify expected deliverables

### DON'T:
❌ Ask for step-by-step guidance
❌ Request intermediate approvals
❌ Break task into manual subtasks
❌ Omit testing requirements

---

## 📖 Real-World Example

### Before (Manual Workflow):
```
User: "Fix the dashboard loading issue"
AI: "Let me check the dashboard file..."
AI: "I see the issue. Can you verify the file exists?"
User: "Yes it exists"
AI: "Can you check the console for errors?"
User: "Shows 404 error for dashboard-v2.js"
AI: "I'll fix that. Can you test after I make the change?"
User: "ok this is really a big waste of my time"
```

### After (Subagent Workflow):
```
User: "Fix the dashboard loading issue using the subagent workflow"

AI: [Launches Explore agent → finds dashboard.html references dashboard-v2.js]
AI: [Launches Plan agent → plans fix and testing strategy]
AI: [Implements fix → updates dashboard.html:898]
AI: [Creates test-references.sh → runs and verifies no v2 references]
AI: [Creates FIX-DASHBOARD-CACHE.md documentation]
AI: [Verifies all changes complete]

AI: "Fixed! The dashboard.html was loading non-existent dashboard-v2.js (line 898).

✅ Changed to dashboard.js
✅ Verified no v2 references remain (grep test passed)
✅ Created FIX-DASHBOARD-CACHE.md with troubleshooting guide
✅ Updated CHANGELOG.md

To verify: Reload extension in chrome://extensions/ and brave://extensions/"

User: [Reloads extension - takes 10 seconds]
User: "Perfect!"
```

---

## 🔗 Related Documentation

- `AI-VISION-COMPLETE.md` - Full implementation guide
- `QUICK-START.md` - Quick reference for humans and LLMs
- `CHANGELOG.md` - Version history
- `DEVELOPMENT.md` - Development guidelines

---

**Version:** 1.0
**Created:** 2025-11-11
**Purpose:** Enable fully autonomous development workflow with minimal user intervention
**Key Principle:** Test autonomously first, involve user only when absolutely necessary
