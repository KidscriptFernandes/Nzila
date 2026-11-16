import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DriverDocumentDTO,
  DriverDocumentType,
  DriverProfileDTO,
} from "@nzila/shared";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { supabase } from "@/lib/supabase";

export function useDriverMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.driverMe,
    queryFn: () => api<{ driver: DriverProfileDTO | null }>("/v1/drivers/me"),
    enabled,
  });
}

export function useDriverDocuments() {
  return useQuery({
    queryKey: queryKeys.driverDocuments,
    queryFn: () => api<{ items: DriverDocumentDTO[] }>("/v1/drivers/me/documents"),
  });
}

interface UploadDocumentInput {
  type: DriverDocumentType;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uri: string;
}

interface UploadTicketResponse {
  uploadUrl: string;
  token: string;
  path: string;
  document: DriverDocumentDTO;
}

export function useUploadDriverDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      const ticket = await api<UploadTicketResponse>("/v1/drivers/me/documents", {
        method: "POST",
        body: {
          type: input.type,
          filename: input.filename,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
        },
      });

      const file = await fetch(input.uri);
      const buffer = await file.arrayBuffer();
      const { error } = await supabase.storage
        .from("driver-docs")
        .uploadToSignedUrl(ticket.path, ticket.token, buffer, {
          contentType: input.contentType,
          upsert: false,
        });

      if (error) throw new Error(error.message);
      return ticket.document;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.driverDocuments });
      void client.invalidateQueries({ queryKey: queryKeys.me });
      void client.invalidateQueries({ queryKey: queryKeys.driverMe });
    },
  });
}
