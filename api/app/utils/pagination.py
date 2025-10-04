from typing import Annotated

from fastapi import Query


class PaginationParams:
    """
    Dependency for extracting pagination parameters from query string.
    """

    def __init__(
        self,
        limit: Annotated[int, Query(ge=1, le=200)] = 50,
        offset: Annotated[int, Query(ge=0)] = 0,
    ):
        self.limit = limit
        self.offset = offset
