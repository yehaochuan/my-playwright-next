export default function request<T>(path: string, params: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    fetch(`http://localhost:6688${path}`, {
      method: "POST",
      body: JSON.stringify(params),
    })
      .then((response) => {
        if (!response.ok) {
          reject("Network response was not ok");
        }
        return response.json() as Promise<T>;
      })
      .then((data) => {
        resolve(data);
      });
  });
}
