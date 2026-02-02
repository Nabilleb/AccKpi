-- Migration: Add StepFinished column to tblWorkflowSteps
-- Purpose: Track when each payment step was completed
-- Date: 2026-02-02

-- Check if column exists, if not add it
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'tblWorkflowSteps' 
               AND COLUMN_NAME = 'StepFinished')
BEGIN
    ALTER TABLE tblWorkflowSteps
    ADD StepFinished DATETIME2 NULL;
    
    PRINT 'Column StepFinished added to tblWorkflowSteps successfully!';
END
ELSE
BEGIN
    PRINT 'Column StepFinished already exists in tblWorkflowSteps';
END

-- Verify the column was added
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tblWorkflowSteps' 
AND COLUMN_NAME = 'StepFinished';
