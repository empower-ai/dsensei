from dataclasses import dataclass
from typing import Union, Optional

ColumnType = Union['DATE', 'TIMESTAMP', 'VARCHAR', 'FLOAT', 'INTEGER']
ColumnMode = Union['NULLABLE', 'REQUIRED', 'REPEATED']


@dataclass(frozen=True)
class Column:
    name: str
    description: str
    type: ColumnType
    mode: ColumnMode


@dataclass(frozen=True)
class Schema:
    name: str
    description: Optional[str]
    columns: list[Column]


@dataclass(frozen=True)
class BigquerySchema(Schema):
    isDateSuffixPartitionTable: bool
