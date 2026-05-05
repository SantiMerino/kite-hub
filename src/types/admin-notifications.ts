export type UnifiedNotificationItem =
  | {
      kind: "staff";
      id: number;
      title: string;
      body: string;
      linkHref: string | null;
      createdAt: string;
      read: boolean;
    }
  | {
      kind: "email";
      id: number;
      title: string;
      body: string;
      toEmail: string;
      createdAt: string;
      read: boolean;
    };
