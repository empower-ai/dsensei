from dataclasses import dataclass
from typing import Union, Optional

FieldType = Union['DATE', 'TIMESTAMP', 'VARCHAR', 'FLOAT', 'INTEGER']
FieldMode = Union['NULLABLE', 'REQUIRED', 'REPEATED']


@dataclass(frozen=True)
class Field:
    name: str
    description: str
    type: FieldType
    mode: FieldMode


@dataclass(frozen=True)
class Schema:
    name: str
    description: Optional[str]
    fields: list[Field]


@dataclass(frozen=True)
class BigquerySchema(Schema):
    isDateSuffixPartitionTable: bool
