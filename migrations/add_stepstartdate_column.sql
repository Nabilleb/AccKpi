-- Add StepStartDate column to tblWorkflowSteps for tracking when each payment step should start
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tblWorkflowSteps' 
    AND COLUMN_NAME = 'StepStartDate'
)
BEGIN
    ALTER TABLE tblWorkflowSteps 
    ADD [StepStartDate] DATETIME NULL;
    
    PRINT 'StepStartDate column added to tblWorkflowSteps successfully';
END
ELSE
BEGIN
    PRINT 'StepStartDate column already exists in tblWorkflowSteps';
END;
