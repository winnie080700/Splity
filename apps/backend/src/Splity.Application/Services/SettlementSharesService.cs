using System.Security.Cryptography;
using System.Text.Json;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.Application.Services;

public sealed class SettlementSharesService(
    IGroupRepository groupRepository,
    ISettlementsService settlementsService,
    ISettlementShareLinkRepository shareLinkRepository,
    IUnitOfWork unitOfWork) : ISettlementSharesService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<SettlementShareRecordDto?> GetActiveAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new KeyNotFoundException("Group not found.");
        }

        var activeLink = await shareLinkRepository.GetActiveByGroupIdAsync(groupId, cancellationToken);
        return activeLink is null ? null : ToRecordDto(activeLink);
    }

    public async Task<SettlementShareRecordDto> CreateAsync(Guid groupId, CreateSettlementShareInput input, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new KeyNotFoundException("Group not found.");
        }

        if (group.Status != GroupStatus.Settling)
        {
            throw new DomainValidationException("Settlement sharing is only available while the group is settling.");
        }

        var existingLink = await shareLinkRepository.GetActiveByGroupIdAsync(groupId, cancellationToken);
        if (existingLink is not null && !input.Regenerate)
        {
            return ToRecordDto(existingLink);
        }

        var nowUtc = DateTime.UtcNow;
        var receiverPaymentInfos = await BuildReceiverPaymentInfosAsync(groupId, input, cancellationToken);

        if (existingLink is not null)
        {
            existingLink.IsActive = false;
        }

        var shareLink = new SettlementShareLink
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            ShareToken = await GenerateUniqueShareTokenAsync(cancellationToken),
            FromDateUtc = input.FromDateUtc,
            ToDateUtc = input.ToDateUtc,
            CreatorName = NormalizeText(input.CreatorName, 150),
            ReceiverPaymentInfosJson = JsonSerializer.Serialize(receiverPaymentInfos, JsonOptions),
            IsActive = true,
            CreatedAtUtc = nowUtc
        };

        await shareLinkRepository.AddAsync(shareLink, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToRecordDto(shareLink, receiverPaymentInfos);
    }

    public async Task<SettlementSharePublicDto> GetByTokenAsync(string shareToken, CancellationToken cancellationToken)
    {
        var normalizedShareToken = NormalizeShareToken(shareToken);
        if (string.IsNullOrWhiteSpace(normalizedShareToken))
        {
            throw new KeyNotFoundException("Settlement share not found.");
        }

        var shareLink = await shareLinkRepository.GetActiveByShareTokenAsync(normalizedShareToken, cancellationToken);
        if (shareLink is null)
        {
            throw new KeyNotFoundException("Settlement share not found.");
        }

        return new SettlementSharePublicDto(
            shareLink.ShareToken,
            shareLink.GroupId,
            shareLink.FromDateUtc,
            shareLink.ToDateUtc,
            NormalizeText(shareLink.CreatorName, 150),
            DeserializeReceiverPaymentInfos(shareLink));
    }

    private async Task<string> GenerateUniqueShareTokenAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt += 1)
        {
            var shareToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
            if (!await shareLinkRepository.ShareTokenExistsAsync(shareToken, cancellationToken))
            {
                return shareToken;
            }
        }

        throw new InvalidOperationException("Unable to generate a unique share token.");
    }

    private async Task<IReadOnlyCollection<SettlementShareReceiverPaymentInfoDto>> BuildReceiverPaymentInfosAsync(
        Guid groupId,
        CreateSettlementShareInput input,
        CancellationToken cancellationToken)
    {
        var settlement = await settlementsService.GetAsync(groupId, input.FromDateUtc, input.ToDateUtc, cancellationToken);
        var receiverById = settlement.NetBalances
            .Where(entry => entry.NetAmount > 0)
            .OrderByDescending(entry => entry.NetAmount)
            .ThenBy(entry => entry.ParticipantName, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(entry => entry.ParticipantId, entry => entry.ParticipantName);

        var duplicateIds = input.ReceiverPaymentInfos
            .GroupBy(entry => entry.ParticipantId)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToArray();
        if (duplicateIds.Length > 0)
        {
            throw new DomainValidationException("Receiver payment info contains duplicate receivers.");
        }

        var inputById = input.ReceiverPaymentInfos.ToDictionary(entry => entry.ParticipantId, entry => entry);
        var invalidIds = inputById.Keys.Where(participantId => !receiverById.ContainsKey(participantId)).ToArray();
        if (invalidIds.Length > 0)
        {
            throw new DomainValidationException("Receiver payment info does not match the current settlement receivers.");
        }

        return receiverById
            .Select(entry =>
            {
                inputById.TryGetValue(entry.Key, out var savedValue);
                return new SettlementShareReceiverPaymentInfoDto(
                    entry.Key,
                    entry.Value,
                    NormalizePaymentInfo(savedValue?.PaymentInfo));
            })
            .ToArray();
    }

    private static SettlementSharePaymentInfoDto NormalizePaymentInfo(SettlementSharePaymentInfoDto? paymentInfo)
    {
        if (paymentInfo is null)
        {
            return EmptyPaymentInfo();
        }

        var normalized = new SettlementSharePaymentInfoDto(
            NormalizeText(paymentInfo.PayeeName, 150) ?? string.Empty,
            NormalizeText(paymentInfo.PaymentMethod, 120) ?? string.Empty,
            NormalizeText(paymentInfo.AccountName, 150) ?? string.Empty,
            NormalizeText(paymentInfo.AccountNumber, 120) ?? string.Empty,
            NormalizeText(paymentInfo.Notes, 2000) ?? string.Empty,
            NormalizeLongText(paymentInfo.PaymentQrDataUrl));

        return normalized;
    }

    private static SettlementShareRecordDto ToRecordDto(
        SettlementShareLink shareLink,
        IReadOnlyCollection<SettlementShareReceiverPaymentInfoDto>? receiverPaymentInfos = null)
    {
        return new SettlementShareRecordDto(
            shareLink.ShareToken,
            shareLink.GroupId,
            shareLink.FromDateUtc,
            shareLink.ToDateUtc,
            NormalizeText(shareLink.CreatorName, 150),
            receiverPaymentInfos ?? DeserializeReceiverPaymentInfos(shareLink),
            shareLink.CreatedAtUtc);
    }

    private static IReadOnlyCollection<SettlementShareReceiverPaymentInfoDto> DeserializeReceiverPaymentInfos(SettlementShareLink shareLink)
    {
        if (!string.IsNullOrWhiteSpace(shareLink.ReceiverPaymentInfosJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<SettlementShareReceiverPaymentInfoDto>>(shareLink.ReceiverPaymentInfosJson, JsonOptions);
                if (parsed is { Count: > 0 })
                {
                    return parsed
                        .Select(entry => entry with
                        {
                            ParticipantName = NormalizeText(entry.ParticipantName, 150) ?? string.Empty,
                            PaymentInfo = NormalizePaymentInfo(entry.PaymentInfo)
                        })
                        .ToArray();
                }
            }
            catch (JsonException)
            {
                // Ignore malformed historical payloads and fall back to legacy columns below.
            }
        }

        var legacyPaymentInfo = NormalizePaymentInfo(new SettlementSharePaymentInfoDto(
            shareLink.PayeeName ?? string.Empty,
            shareLink.PaymentMethod ?? string.Empty,
            shareLink.AccountName ?? string.Empty,
            shareLink.AccountNumber ?? string.Empty,
            shareLink.Notes ?? string.Empty,
            shareLink.PaymentQrDataUrl ?? string.Empty));

        var hasLegacyInfo = !string.IsNullOrWhiteSpace(legacyPaymentInfo.PayeeName)
            || !string.IsNullOrWhiteSpace(legacyPaymentInfo.PaymentMethod)
            || !string.IsNullOrWhiteSpace(legacyPaymentInfo.AccountName)
            || !string.IsNullOrWhiteSpace(legacyPaymentInfo.AccountNumber)
            || !string.IsNullOrWhiteSpace(legacyPaymentInfo.Notes)
            || !string.IsNullOrWhiteSpace(legacyPaymentInfo.PaymentQrDataUrl);

        return hasLegacyInfo
            ? new[]
            {
                new SettlementShareReceiverPaymentInfoDto(
                    Guid.Empty,
                    NormalizeText(shareLink.PayeeName, 150) ?? string.Empty,
                    legacyPaymentInfo)
            }
            : Array.Empty<SettlementShareReceiverPaymentInfoDto>();
    }

    private static SettlementSharePaymentInfoDto EmptyPaymentInfo()
    {
        return new SettlementSharePaymentInfoDto(string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty);
    }

    private static string? NormalizeShareToken(string? shareToken)
    {
        return shareToken?.Trim().ToLowerInvariant();
    }

    private static string? NormalizeText(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }

    private static string NormalizeLongText(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }
}
