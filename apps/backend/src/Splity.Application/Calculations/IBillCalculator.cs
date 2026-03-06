namespace Splity.Application.Calculations;

public interface IBillCalculator
{
    BillComputationResult CalculateBillShares(BillCalculationInput input);
}
