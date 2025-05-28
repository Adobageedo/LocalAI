import React, { useState } from "react";
import { IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function FolderTable({ docs, onDelete }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper elevation={1} sx={{ width: "100%", overflow: "hidden", mb: 2 }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Name/Source</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {docs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((doc) => (
              <TableRow hover key={doc.unique_id || doc.doc_id}>
                <TableCell>{doc.document_type}</TableCell>
                <TableCell>
                  <Tooltip title={doc.source_path || ""} placement="top" arrow>
                    <span>{doc.display_name || doc.attachment_name || (doc.source_path ? doc.source_path.split("/").pop() : "[Unknown]")}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{doc.user}</TableCell>
                <TableCell>{doc.date}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => onDelete(doc.doc_id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={docs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
