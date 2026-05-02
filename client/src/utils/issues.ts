export function getIssues(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'issues' in data &&
    Array.isArray((data as { issues: unknown }).issues)
  ) {
    return (data as { issues: unknown[] }).issues
      .map((issue) => {
        if (typeof issue === 'string') {
          return issue;
        }

        if (typeof issue === 'object' && issue !== null && 'message' in issue) {
          return String((issue as { message: unknown }).message);
        }

        return null;
      })
      .filter((issue): issue is string => Boolean(issue));
  }

  return [];
}
