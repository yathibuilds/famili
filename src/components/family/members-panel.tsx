async function removeMember(memberId: string, memberName: string) {
  setLoading(true);
  setMessage(null);

  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to_member_id", memberId);

  if (countError) {
    setLoading(false);
    console.error("Task count failed:", countError);
    setMessage(countError.message);
    alert(`Could not check assigned tasks: ${countError.message}`);
    return;
  }

  const assignedCount = count ?? 0;
  const confirmMessage =
    assignedCount > 0
      ? `Remove ${memberName}? ${assignedCount} assigned task(s) will be unassigned.`
      : `Remove ${memberName}?`;

  const confirmed = confirm(confirmMessage);
  if (!confirmed) {
    setLoading(false);
    return;
  }

  if (assignedCount > 0) {
    const { error: unassignError } = await supabase
      .from("tasks")
      .update({ assigned_to_member_id: null })
      .eq("assigned_to_member_id", memberId);

    if (unassignError) {
      setLoading(false);
      console.error("Task unassign failed:", unassignError);
      setMessage(unassignError.message);
      alert(`Could not unassign tasks: ${unassignError.message}`);
      return;
    }
  }

  const { error: deleteError } = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    setLoading(false);
    console.error("Member delete failed:", deleteError);
    setMessage(deleteError.message);
    alert(`Could not remove member: ${deleteError.message}`);
    return;
  }

  setLoading(false);

  if (editingId === memberId) {
    cancelEdit();
  }

  setMessage("Member removed.");
  await loadMembers();
}
