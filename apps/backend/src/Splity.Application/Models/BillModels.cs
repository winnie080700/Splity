using Splity.Domain.Enums;

namespace Splity.Application.Models;

public sealed record BillItemInput(string Description, decimal Amount, IReadOnlyCollection<Guid> ResponsibleParticipantIds);

public sealed record BillFeeInput(string Name, FeeType FeeType, decimal Value);

public sealed record BillParticipantInput(Guid ParticipantId, decimal? Weight);

public sealed record BillContributionInput(Guid ParticipantId, decimal Amount);

public sealed record CreateBillInput(
    string StoreName,
    string? ReferenceImageDataUrl,
    DateTime TransactionDateUtc,
    SplitMode SplitMode,
    Guid PrimaryPayerParticipantId,
    IReadOnlyCollection<BillItemInput> Items,
    IReadOnlyCollection<BillFeeInput> Fees,
    IReadOnlyCollection<BillParticipantInput> Participants,
    IReadOnlyCollection<BillContributionInput> ExtraContributions);

public sealed record UpdateBillInput(
    string StoreName,
    string? ReferenceImageDataUrl,
    DateTime TransactionDateUtc,
    SplitMode SplitMode,
    Guid PrimaryPayerParticipantId,
    IReadOnlyCollection<BillItemInput> Items,
    IReadOnlyCollection<BillFeeInput> Fees,
    IReadOnlyCollection<BillParticipantInput> Participants,
    IReadOnlyCollection<BillContributionInput> ExtraContributions);

public sealed record BillShareDto(
    Guid ParticipantId,
    string ParticipantName,
    decimal Weight,
    decimal PreFeeAmount,
    decimal FeeAmount,
    decimal TotalShareAmount);

public sealed record BillContributionDto(Guid ParticipantId, string ParticipantName, decimal Amount);

public sealed record BillItemAssigneeDto(Guid ParticipantId, string ParticipantName);

public sealed record BillItemDto(
    Guid Id,
    string Description,
    decimal Amount,
    IReadOnlyCollection<BillItemAssigneeDto> ResponsibleParticipants);

public sealed record BillFeeDto(Guid Id, string Name, FeeType FeeType, decimal Value, decimal AppliedAmount);

public sealed record BillSummaryDto(
    Guid Id,
    Guid GroupId,
    string StoreName,
    string? ReferenceImageDataUrl,
    DateTime TransactionDateUtc,
    SplitMode SplitMode,
    Guid PrimaryPayerParticipantId,
    decimal SubtotalAmount,
    decimal TotalFeeAmount,
    decimal GrandTotalAmount);

public sealed record BillDetailDto(
    Guid Id,
    Guid GroupId,
    string StoreName,
    string? ReferenceImageDataUrl,
    DateTime TransactionDateUtc,
    SplitMode SplitMode,
    Guid PrimaryPayerParticipantId,
    decimal SubtotalAmount,
    decimal TotalFeeAmount,
    decimal GrandTotalAmount,
    IReadOnlyCollection<BillItemDto> Items,
    IReadOnlyCollection<BillFeeDto> Fees,
    IReadOnlyCollection<BillShareDto> Shares,
    IReadOnlyCollection<BillContributionDto> Contributions);
