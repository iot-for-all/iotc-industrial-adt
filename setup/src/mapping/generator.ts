export function generateQuery(data: string) {
  let query = `import "iotc" as iotc;
(.telemetry | iotc::find(.name=="name").value) as $name |empty,
(.telemetry | iotc::find(.name=="nodeid").value) as $id | empty,
(.telemetry | iotc::find(.name=="value").value) as $value | empty,
(`;

  const mappings = JSON.parse(data);
  Object.keys(mappings).forEach((nodeid, index) => {
    query += `${index === 0 ? "if" : "elif"} $id=="${nodeid}" then "${
      mappings[nodeid]
    }" `;
  });
  query += `else $id end) as $id | empty,
  {
      id:$id,
      name:$name,
      value:$value
  }
  `;
  return query;
}
