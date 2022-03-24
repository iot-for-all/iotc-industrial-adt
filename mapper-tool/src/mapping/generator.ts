export type MappingProps = {
  "Node name": string;
  "Node id": string;
  "Twin id": string;
  "Twin name": string;
  Property: string;
  Component?: string;
};

export function generateQuery(data: string) {
  let query = `import "iotc" as iotc;
(.telemetry | iotc::find(.name=="name").value) as $name |empty,
(.telemetry | iotc::find(.name=="nodeid").value) as $id | empty,
(.telemetry | iotc::find(.name=="value").value) as $value | empty,
(`;

  const mappings: MappingProps[] = JSON.parse(data);
  mappings.forEach((mapping, index) => {
    query += `${index === 0 ? "if" : "elif"} $id=="${
      mapping["Node id"]
    }" then "${mapping["Twin id"]}/${
      mapping.Component ? mapping.Component + "/" : ""
    }${mapping.Property}" `;
  });
  query += `else $id end) as $id | empty,
  {
      twinRawId:$id,
      value:$value
  }
  `;
  return query;
}
