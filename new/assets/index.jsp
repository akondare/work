<%@page import="java.io.FileReader"%>
    <%@page import="java.io.BufferedReader"%>
        <%@page contentType="text/html" pageEncoding="UTF-8"%>
            <%
            String indexFile = "./index.html";
            String indexFilePath = getServletContext().getRealPath(indexFile);
            BufferedReader reader = new BufferedReader(new FileReader(indexFilePath));
            StringBuilder sb = new StringBuilder();
            String line;
            while((line = reader.readLine())!= null){
                sb.append(line);
            }
            reader.close();
            out.println(sb.toString());
%>