from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..models import DataFileMetadata, DataFileMetadataValidator, SourceCode
from ..async_session import async_session




async def create_datafile_metadata(
    source_code_id: int, is_editable: bool = False, rows: int = 10, cols: int = 50
) -> DataFileMetadataValidator:
    """
    Create metadata for a DataFile
    
    :param source_code_id: ID of the source_code entry
    :param is_editable: Whether the datafile should be editable
    :param rows: Number of rows for display
    :param cols: Number of columns for display
    :return: DataFileMetadataValidator object
    """
    async with async_session.begin() as session:
        new_metadata = DataFileMetadata(
            source_code_id=source_code_id,
            is_editable=is_editable,
            rows=rows,
            cols=cols
        )
        session.add(new_metadata)
        await session.flush()  # Get the ID
        return DataFileMetadataValidator.from_orm(new_metadata)


async def get_datafile_metadata(source_code_id: int) -> DataFileMetadataValidator:
    """
    Get metadata for a DataFile by source_code_id
    
    :param source_code_id: ID of the source_code entry
    :return: DataFileMetadataValidator object or None
    """
    async with async_session() as session:
        query = select(DataFileMetadata).where(
            DataFileMetadata.source_code_id == source_code_id
        )
        result = await session.execute(query)
        metadata = result.scalars().first()
        return DataFileMetadataValidator.from_orm(metadata) if metadata else None


async def get_datafiles_with_metadata(course_id: str):
    """
    Get all DataFiles with their metadata for a course
    
    :param course_id: Course ID
    :return: List of source_code entries with metadata
    """
    async with async_session() as session:
        query = (
            select(SourceCode)
            .options(selectinload(SourceCode.metadata))
            .where(SourceCode.course_id == course_id)
        )
        result = await session.execute(query)
        return result.scalars().all()


async def update_datafile_metadata(
    source_code_id: int, is_editable: bool = None, rows: int = None, cols: int = None
) -> DataFileMetadataValidator:
    """
    Update metadata for a DataFile
    
    :param source_code_id: ID of the source_code entry
    :param is_editable: Whether the datafile should be editable
    :param rows: Number of rows for display
    :param cols: Number of columns for display
    :return: Updated DataFileMetadataValidator object
    """
    async with async_session.begin() as session:
        query = select(DataFileMetadata).where(
            DataFileMetadata.source_code_id == source_code_id
        )
        result = await session.execute(query)
        metadata = result.scalars().first()
        
        if metadata:
            if is_editable is not None:
                metadata.is_editable = is_editable
            if rows is not None:
                metadata.rows = rows
            if cols is not None:
                metadata.cols = cols
            return DataFileMetadataValidator.from_orm(metadata)
        else:
            # Create new metadata if it doesn't exist
            return await create_datafile_metadata(
                source_code_id, 
                is_editable or False, 
                rows or 10, 
                cols or 50
            )