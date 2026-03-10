async function getProjects() {
  const res = await fetch("http://localhost:3000/api/projects", { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = await res.json();
  return data.projects ?? [];
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main style={{ padding: 24 }}>
      <h1>Projects</h1>
      <p>Track construction contracts and project-level profitability.</p>

      <div style={{ marginTop: 24, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12 }}>Project</th>
              <th style={{ textAlign: "left", padding: 12 }}>Client</th>
              <th style={{ textAlign: "left", padding: 12 }}>Contract Amount</th>
              <th style={{ textAlign: "left", padding: 12 }}>Status</th>
              <th style={{ textAlign: "left", padding: 12 }}>Dates</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p: any) => (
              <tr key={p.id}>
                <td style={{ padding: 12 }}>{p.projectName}</td>
                <td style={{ padding: 12 }}>{p.client?.name ?? "-"}</td>
                <td style={{ padding: 12 }}>₱{Number(p.contractAmount).toLocaleString()}</td>
                <td style={{ padding: 12 }}>{p.status}</td>
                <td style={{ padding: 12 }}>
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}
                  {" → "}
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
            {projects.length === 0 ? (
              <tr>
                <td style={{ padding: 12 }} colSpan={5}>No projects yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
