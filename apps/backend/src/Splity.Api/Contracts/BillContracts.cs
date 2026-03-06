using Splity.Domain.Enums;

namespace Splity.Api.Contracts;

public sealed record BillItemRequest(string Description, decimal Amount);

public sealed record BillFeeRequest(string Name, FeeType FeeType, decimal Value);

public sealed record BillParticipantRequest(Guid ParticipantId, decimal? Weight);

public sealed record BillContributionRequest(Guid ParticipantId, decimal Amount);

public sealed record CreateBillRequest(
    string StoreName,
    DateTime TransactionDateUtc,
    SplitMode SplitMode,
    Guid PrimaryPayerParticipantId,
    IReadOnlyCollection<BillItemRequest> Items,
    IReadOnlyCollection<BillFeeRequest> Fees,
    IReadOnlyCollection<BillParticipantRequest> Participants,
    IReadOnlyCollection<BillContributionRequest> ExtraContributions);

public sealed record UpdateBillRequest(
    string StoreName,
    DateTime TransactionDateUtc,
    SplitMode SplitMode,
    Guid PrimaryPayerParticipantId,
    IReadOnlyCollection<BillItemRequest> Items,
    IReadOnlyCollection<BillFeeRequest> Fees,
    IReadOnlyCollection<BillParticipantRequest> Participants,
    IReadOnlyCollection<BillContributionRequest> ExtraContributions);
