namespace Splity.Application.Models;

public sealed record ParticipantNetBalanceDto(Guid ParticipantId, string ParticipantName, decimal NetAmount);

public sealed record SettlementTransferDto(Guid FromParticipantId, Guid ToParticipantId, decimal Amount);

public sealed record SettlementResultDto(
    Guid GroupId,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    IReadOnlyCollection<ParticipantNetBalanceDto> NetBalances,
    IReadOnlyCollection<SettlementTransferDto> Transfers);
