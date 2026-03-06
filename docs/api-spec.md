# Splity API Spec (v1)

Base path: `/api`

## Groups
- `POST /groups`
  - body: `{ "name": "Trip" }`
  - returns: `GroupDto`

## Participants
- `POST /groups/{groupId}/participants`
  - body: `{ "name": "Alice" }`
  - returns: `ParticipantDto`
- `GET /groups/{groupId}/participants`
  - returns: `ParticipantDto[]`

## Bills
- `POST /groups/{groupId}/bills`
  - body: `CreateBillRequest`
  - returns: `BillDetailDto`
- `GET /groups/{groupId}/bills?store=&fromDate=&toDate=`
  - returns: `BillSummaryDto[]`
- `GET /groups/{groupId}/bills/{billId}`
  - returns: `BillDetailDto`
- `PUT /groups/{groupId}/bills/{billId}`
  - body: `UpdateBillRequest`
  - returns: `BillDetailDto`
- `DELETE /groups/{groupId}/bills/{billId}`
  - returns: `204`

## Settlements
- `GET /groups/{groupId}/settlements?fromDate=&toDate=`
  - returns: `SettlementResultDto`

## Errors
- Validation: `400` ProblemDetails
- Missing resource: `404` ProblemDetails
- Server error: `500` ProblemDetails
