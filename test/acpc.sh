
#o3d in soichi7
#project_id="58eeceaabb2e2e2bd70d4682"

#o3d in brain-life
project_id="58ef90c87446bb0021cd26d4"

subject=158035
type="neuro/anat"
../import.js \
    --name "ACPC aligned $subject" \
    --desc "ACPC aligned anatomy for $subject" \
    --datatype_tag "acpc_aligned" \
    --project_id $project_id --tag "o3d" --type $type --subject $subject \
    /mnt/auto/dc2/projects/o3d/o3d-workflow/acpc/$subject