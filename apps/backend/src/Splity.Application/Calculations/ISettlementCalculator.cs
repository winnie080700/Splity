namespace Splity.Application.Calculations;

public interface ISettlementCalculator
{
    IReadOnlyCollection<SettlementTransfer> CalculateTransfers(IReadOnlyCollection<NetBalance> netBalances);
}
