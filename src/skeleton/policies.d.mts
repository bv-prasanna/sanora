export function hasSanoraPermission(roles: string[], action: "view"|"create"|"edit"|"delete"|"approve"|"export"|"manage"): boolean;
export function redactAuditMetadata(metadata: unknown): unknown;
export function estimateProjectTotal(lines: Array<{quantity: number|string;unitRate:number|string}>): {totalPaise:number;totalRupees:string;currency:"INR"};
export function validateProjectTransition(current:string,next:string,actorId:string,allowed:boolean): {from:string;to:string;actorId:string;reason:string;at:string};
