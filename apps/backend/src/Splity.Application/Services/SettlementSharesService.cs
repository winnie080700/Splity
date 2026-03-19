using System.Security.Cryptography;
using Splity.Application.Abstractions;
using Splity.Application.Models;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class SettlementSharesService(
    IGroupRepository groupRepository,
    ISettlementShareLinkRepository shareLinkRepository,
    IUnitOfWork unitOfWork) : ISettlementSharesService
{
    public async Task<SettlementShareLinkDto> CreateAsync(Guid groupId, CreateSettlementShareInput input, CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new KeyNotFoundException("Group not found.");
        }

        var nowUtc = DateTime.UtcNow;
        var paymentInfo = NormalizePaymentInfo(input.PaymentInfo);
        var shareLink = new SettlementShareLink
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            ShareToken = await GenerateUniqueShareTokenAsync(cancellationToken),
            FromDateUtc = input.FromDateUtc,
            ToDateUtc = input.ToDateUtc,
            CreatorName = NormalizeText(input.CreatorName, 150),
            PayeeName = paymentInfo?.PayeeName,
            PaymentMethod = paymentInfo?.PaymentMethod,
            AccountName = paymentInfo?.AccountName,
            AccountNumber = paymentInfo?.AccountNumber,
            Notes = paymentInfo?.Notes,
            PaymentQrDataUrl = paymentInfo?.PaymentQrDataUrl,
            CreatedAtUtc = nowUtc
        };

        await shareLinkRepository.AddAsync(shareLink, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new SettlementShareLinkDto(shareLink.ShareToken, shareLink.CreatedAtUtc);
    }

    public async Task<SettlementSharePublicDto> GetByTokenAsync(string shareToken, CancellationToken cancellationToken)
    {
        var normalizedShareToken = NormalizeShareToken(shareToken);
        if (string.IsNullOrWhiteSpace(normalizedShareToken))
        {
            throw new KeyNotFoundException("Settlement share not found.");
        }

        var shareLink = await shareLinkRepository.GetByShareTokenAsync(normalizedShareToken, cancellationToken);
        if (shareLink is null)
        {
            throw new KeyNotFoundException("Settlement share not found.");
        }

        var paymentInfo = BuildPaymentInfoDto(shareLink);
        return new SettlementSharePublicDto(
            shareLink.ShareToken,
            shareLink.GroupId,
            shareLink.FromDateUtc,
            shareLink.ToDateUtc,
            NormalizeText(shareLink.CreatorName, 150),
            paymentInfo);
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

    private static SettlementSharePaymentInfoDto? BuildPaymentInfoDto(SettlementShareLink shareLink)
    {
        var paymentInfo = NormalizePaymentInfo(new SettlementSharePaymentInfoDto(
            shareLink.PayeeName ?? string.Empty,
            shareLink.PaymentMethod ?? string.Empty,
            shareLink.AccountName ?? string.Empty,
            shareLink.AccountNumber ?? string.Empty,
            shareLink.Notes ?? string.Empty,
            shareLink.PaymentQrDataUrl ?? string.Empty));

        return paymentInfo;
    }

    private static SettlementSharePaymentInfoDto? NormalizePaymentInfo(SettlementSharePaymentInfoDto? paymentInfo)
    {
        if (paymentInfo is null)
        {
            return null;
        }

        var normalized = new SettlementSharePaymentInfoDto(
            NormalizeText(paymentInfo.PayeeName, 150) ?? string.Empty,
            NormalizeText(paymentInfo.PaymentMethod, 120) ?? string.Empty,
            NormalizeText(paymentInfo.AccountName, 150) ?? string.Empty,
            NormalizeText(paymentInfo.AccountNumber, 120) ?? string.Empty,
            NormalizeText(paymentInfo.Notes, 2000) ?? string.Empty,
            NormalizeLongText(paymentInfo.PaymentQrDataUrl));

        return string.IsNullOrWhiteSpace(normalized.PayeeName)
               && string.IsNullOrWhiteSpace(normalized.PaymentMethod)
               && string.IsNullOrWhiteSpace(normalized.AccountName)
               && string.IsNullOrWhiteSpace(normalized.AccountNumber)
               && string.IsNullOrWhiteSpace(normalized.Notes)
               && string.IsNullOrWhiteSpace(normalized.PaymentQrDataUrl)
            ? null
            : normalized;
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
