# Force Loop Detection Test

This test creates a scenario where the Edit tool **cannot succeed**, forcing consecutive failures.

## Setup

Create a read-only file (Windows):

```powershell
# Create the file
"test content" | Out-File test-readonly.txt

# Make it read-only
Set-ItemProperty test-readonly.txt -Name IsReadOnly -Value $true

# Verify
Get-ItemProperty test-readonly.txt | Select-Object IsReadOnly
```

## Test

Ask Claude:

> "Edit test-readonly.txt and replace 'test' with 'changed'. The edit tool should work, keep trying with Edit - do not use any other approach."

## Expected Behavior

1. First Edit attempt → fails (permission denied)
2. Second Edit attempt → fails (permission denied)
3. Third Edit attempt → fails (permission denied)
4. Fourth attempt → **Loop detection triggers**:
   ```
   [LZ-CYBERNETICS] Oscillation/loop pattern detected.
   Consecutive failures: Edit (3 times)
   ```

## Why This Works

- The file physically cannot be edited (read-only)
- The instruction constrains Claude to only use Edit
- Claude cannot "adapt" because the problem is external
- This simulates real-world scenarios like permission issues or locked files

## Cleanup

```powershell
Set-ItemProperty test-readonly.txt -Name IsReadOnly -Value $false
Remove-Item test-readonly.txt
```

## Note

In normal operation, Claude would:
1. Recognize the permission error
2. Suggest making the file writable
3. Or ask for help

The loop detection is a safety net for when Claude's normal intelligence can't solve the problem.
