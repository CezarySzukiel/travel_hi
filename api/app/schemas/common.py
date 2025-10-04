from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic schema for paginated API responses.

    Attributes:
        data: List of result items.
        total: Total number of items matching the query.
        limit: Maximum number of items per page.
        offset: Number of items skipped before this page.
    """

    data: list[T] = Field(..., description="List of items on this page")
    total: int = Field(..., description="Total number of matching items")
    limit: int = Field(..., description="Maximum number of items per page")
    offset: int = Field(..., description="Number of skipped items before this page")

    @classmethod
    def create(cls, *, data: list[T], total: int, limit: int, offset: int):
        """
        Factory method to create a paginated response.
        """
        return cls(data=data, total=total, limit=limit, offset=offset)
